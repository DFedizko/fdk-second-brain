import { IndexWriteConflict } from "../../domain/errors/index-write-conflict";
import { NoteNotFound } from "../../domain/errors/note-not-found";
import type { MarkdownChunker } from "../../domain/markdown-chunker";
import { Note } from "../../domain/note";
import { NotePath } from "../../domain/note-path";
import { NoteVersion } from "../../domain/note-version";
import type { NoteRepository } from "../ports/note-repository";
import type { SearchIndex } from "../ports/search-index";

export const MAX_INDEX_ATTEMPTS = 5;
export const MAX_INDEX_PASSES = 20;
const UNCHANGED: IndexStatus = "unchanged";

export interface SavedNote {
  readonly content: string;
  readonly version: string;
}

export interface IndexNoteInput {
  readonly path: string;
  readonly saved?: SavedNote;
}

export type IndexStatus = "indexed" | "removed" | "unchanged";

export interface IndexNoteResult {
  readonly path: string;
  readonly status: IndexStatus;
}

interface RetryBudget {
  readonly attempts: number;
  readonly passes: number;
}

type NoteSource = () => Promise<Note | null>;

const FULL_BUDGET: RetryBudget = { attempts: MAX_INDEX_ATTEMPTS, passes: MAX_INDEX_PASSES };

export interface NoteIndexer {
  execute(input: IndexNoteInput): Promise<IndexNoteResult>;
}

// Messages can arrive late or twice, so the note is re-read at the head and the
// index is written only over the version seen before that read (compare-and-set).
// Blob SHAs repeat when an edit is reverted, so after every write it checks again
// until a pass finds the index already matching the head. Only passes that lose
// the compare-and-set use up an attempt, so a burst of saves can't exhaust them;
// a larger cap on all passes still ends a loop when saves never stop. Right after
// a save the saved note is used as is, since a read then can still be stale; once
// another indexer wins the compare-and-set, the head is read, as it may be newer.
export class IndexNote implements NoteIndexer {
  constructor(
    private readonly index: SearchIndex,
    private readonly notes: NoteRepository,
    private readonly chunker: MarkdownChunker,
  ) {}

  async execute(input: IndexNoteInput): Promise<IndexNoteResult> {
    const path = NotePath.of(input.path);
    const source = this.chooseSource(path, input.saved);
    return { path: path.value, status: await this.syncWithRetry(path, source, FULL_BUDGET) };
  }

  private chooseSource(path: NotePath, saved?: SavedNote): NoteSource {
    if (saved === undefined) return this.headOf(path);
    const note = new Note(path, saved.content, NoteVersion.of(saved.version));
    return async () => note;
  }

  private headOf(path: NotePath): NoteSource {
    return () => this.readCurrent(path);
  }

  private async syncWithRetry(
    path: NotePath,
    source: NoteSource,
    budget: RetryBudget,
    applied?: IndexStatus,
  ): Promise<IndexStatus> {
    if (budget.attempts <= 0 || budget.passes <= 0) throw new IndexWriteConflict(path.value);
    const outcome = await this.syncOnce(path, source);
    if (outcome === UNCHANGED) return applied ?? outcome;
    const passes = budget.passes - 1;
    if (outcome === undefined) {
      return this.syncWithRetry(
        path,
        this.headOf(path),
        { attempts: budget.attempts - 1, passes },
        applied,
      );
    }
    return this.syncWithRetry(path, source, { attempts: budget.attempts, passes }, outcome);
  }

  private async syncOnce(path: NotePath, source: NoteSource): Promise<IndexStatus | undefined> {
    const indexed = await this.index.versionOf(path);
    const note = await source();
    if (note === null) return this.removeIndexed(path, indexed);
    if (indexed?.equals(note.version)) return "unchanged";
    const chunks = this.chunker.chunk(note.content);
    const applied = await this.index.replace(path, note.version, chunks, indexed);
    return applied ? "indexed" : undefined;
  }

  private async removeIndexed(
    path: NotePath,
    indexed: NoteVersion | null,
  ): Promise<IndexStatus | undefined> {
    if (indexed === null) return "unchanged";
    return (await this.index.remove(path, indexed)) ? "removed" : undefined;
  }

  private async readCurrent(path: NotePath): Promise<Note | null> {
    return this.notes.read(path).catch((error: unknown) => {
      if (error instanceof NoteNotFound) return null;
      throw error;
    });
  }
}
