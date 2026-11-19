import type { MarkdownChunk } from "../../domain/markdown-chunk";
import type { NotePath } from "../../domain/note-path";
import type { NoteVersion } from "../../domain/note-version";
import type { SearchQuery } from "../../domain/search-query";

export interface SearchHit {
  readonly path: NotePath;
  readonly heading: string;
  readonly snippet: string;
}

export interface SearchIndex {
  search(query: SearchQuery, limit: number): Promise<SearchHit[]>;
  versionOf(path: NotePath): Promise<NoteVersion | null>;
  replace(path: NotePath, version: NoteVersion, chunks: readonly MarkdownChunk[]): Promise<void>;
  remove(path: NotePath): Promise<void>;
}
