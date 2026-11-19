import type { NotePath } from "../../domain/note-path";

export interface SearchHit {
  readonly path: NotePath;
  readonly heading: string;
  readonly snippet: string;
}

export interface SearchIndex {
  search(query: string, limit: number): Promise<SearchHit[]>;
}
