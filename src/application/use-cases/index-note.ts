import { IndexWriteConflict } from "../../domain/errors/index-write-conflict";
import { NoteNotFound } from "../../domain/errors/note-not-found";
import { UnreadableNote } from "../../domain/errors/unreadable-note";
import type { MarkdownChunker } from "../../domain/markdown-chunker";
import { Note } from "../../domain/note";
import { NotePath } from "../../domain/note-path";
import { NoteVersion } from "../../domain/note-version";
import type { NoteLookup } from "../ports/note-lookup";
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

export class IndexNote implements NoteIndexer {
  constructor(
    private readonly index: SearchIndex,
    private readonly notes: NoteLookup,
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
    const note = await source().catch((error: unknown) =>
      this.dropUnreadable(path, indexed, error),
    );
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

  private async dropUnreadable(
    path: NotePath,
    indexed: NoteVersion | null,
    error: unknown,
  ): Promise<never> {
    if (error instanceof UnreadableNote) await this.removeIndexed(path, indexed);
    throw error;
  }

  private async readCurrent(path: NotePath): Promise<Note | null> {
    return this.notes.read(path).catch((error: unknown) => {
      if (error instanceof NoteNotFound) return null;
      throw error;
    });
  }
}
