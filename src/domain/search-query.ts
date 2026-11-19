import { EmptySearchQuery } from "./errors/empty-search-query";

const WORD = /[\p{L}\p{M}\p{N}]+/gu;
export const MAX_QUERY_TERMS = 12;

export class SearchQuery {
  private constructor(readonly terms: readonly string[]) {}

  static of(raw: string): SearchQuery {
    const terms = raw.match(WORD) ?? [];
    if (terms.length === 0) throw new EmptySearchQuery(raw);
    return new SearchQuery(terms.slice(0, MAX_QUERY_TERMS));
  }
}
