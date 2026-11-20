import { IndexWriteConflict } from "../../domain/errors/index-write-conflict";
import { NoteNotFound } from "../../domain/errors/note-not-found";
import type { MarkdownChunker } from "../../domain/markdown-chunker";
import type { Note } from "../../domain/note";
import { NotePath } from "../../domain/note-path";
import type { NoteVersion } from "../../domain/note-version";
import type { NoteRepository } from "../ports/note-repository";
import type { SearchIndex } from "../ports/search-index";

export const MAX_INDEX_ATTEMPTS = 5;
const UNCHANGED: IndexStatus = "unchanged";

export interface IndexNoteInput {
  readonly path: string;
}

export type IndexStatus = "indexed" | "removed" | "unchanged";

export interface IndexNoteResult {
  readonly path: string;
  readonly status: IndexStatus;
}

export interface NoteIndexer {
  execute(input: IndexNoteInput): Promise<IndexNoteResult>;
}

// Messages can arrive late or twice, so the note is re-read at the head and the
// index is written only over the version seen before that read (compare-and-set).
// Blob SHAs repeat when an edit is reverted, so after every write it checks again
// until a pass finds the index already matching the head.
export class IndexNote implements NoteIndexer {
  constructor(
    private readonly index: SearchIndex,
    private readonly notes: NoteRepository,
    private readonly chunker: MarkdownChunker,
  ) {}

  async execute(input: IndexNoteInput): Promise<IndexNoteResult> {
    const path = NotePath.of(input.path);
    return { path: path.value, status: await this.syncWithRetry(path, MAX_INDEX_ATTEMPTS) };
  }

  private async syncWithRetry(
    path: NotePath,
    attemptsLeft: number,
    applied?: IndexStatus,
  ): Promise<IndexStatus> {
    if (attemptsLeft <= 0) throw new IndexWriteConflict(path.value);
    const outcome = await this.syncOnce(path);
    if (outcome === UNCHANGED) return applied ?? outcome;
    return this.syncWithRetry(path, attemptsLeft - 1, outcome ?? applied);
  }

  private async syncOnce(path: NotePath): Promise<IndexStatus | undefined> {
    const indexed = await this.index.versionOf(path);
    const note = await this.readCurrent(path);
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
