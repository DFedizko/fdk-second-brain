import type { SearchHit, SearchIndex } from "../../../../src/application/ports/search-index";
import type { MarkdownChunk } from "../../../../src/domain/markdown-chunk";
import { NotePath } from "../../../../src/domain/note-path";
import type { NoteVersion } from "../../../../src/domain/note-version";
import type { SearchQuery } from "../../../../src/domain/search-query";

const WORD = /[\p{L}\p{M}\p{N}]+/gu;

interface IndexedNote {
  readonly version: NoteVersion;
  readonly chunks: readonly MarkdownChunk[];
}

type WriteHook = () => Promise<void>;

export class InMemorySearchIndex implements SearchIndex {
  private readonly notes = new Map<string, IndexedNote>();
  private hooks: WriteHook[] = [];
  private inHook = false;

  async search(query: SearchQuery, limit: number): Promise<SearchHit[]> {
    const terms = query.terms.map((term) => term.toLowerCase());
    return [...this.notes.entries()]
      .flatMap(([path, note]) => note.chunks.map((chunk) => this.toHit(path, chunk)))
      .filter((hit) => this.matches(hit, terms))
      .slice(0, limit);
  }

  async versionOf(path: NotePath): Promise<NoteVersion | null> {
    return this.notes.get(path.value)?.version ?? null;
  }

  async replace(
    path: NotePath,
    version: NoteVersion,
    chunks: readonly MarkdownChunk[],
    expected: NoteVersion | null,
  ): Promise<boolean> {
    await this.runHook();
    if (!this.holds(path, expected)) return false;
    this.notes.set(path.value, { version, chunks });
    return true;
  }

  async remove(path: NotePath, expected: NoteVersion | null): Promise<boolean> {
    await this.runHook();
    if (!this.holds(path, expected)) return false;
    this.notes.delete(path.value);
    return true;
  }

  beforeNextWrites(...hooks: WriteHook[]): void {
    this.hooks = hooks;
  }

  chunksOf(path: string): readonly MarkdownChunk[] {
    return this.notes.get(path)?.chunks ?? [];
  }

  private async runHook(): Promise<void> {
    const [hook, ...rest] = this.hooks;
    if (this.inHook || !hook) return;
    this.hooks = rest;
    this.inHook = true;
    await hook().finally(() => {
      this.inHook = false;
    });
  }

  private holds(path: NotePath, expected: NoteVersion | null): boolean {
    const current = this.notes.get(path.value)?.version ?? null;
    if (current === null || expected === null) return current === expected;
    return current.equals(expected);
  }

  private toHit(path: string, chunk: MarkdownChunk): SearchHit {
    return { path: NotePath.of(path), heading: chunk.heading, snippet: chunk.text };
  }

  private matches(hit: SearchHit, terms: readonly string[]): boolean {
    const words = `${hit.heading} ${hit.snippet}`.toLowerCase().match(WORD) ?? [];
    return terms.some((term) => words.some((word) => word.startsWith(term)));
  }
}
