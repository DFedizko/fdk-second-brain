import { safeCutIndex } from "../../domain/safe-cut";
import { SearchQuery } from "../../domain/search-query";
import type { SearchHit, SearchIndex } from "../ports/search-index";

export const DEFAULT_SEARCH_LIMIT = 5;
export const MAX_SEARCH_LIMIT = 20;
export const SNIPPET_MAX_CHARS = 300;
export const MIN_SEARCH_LIMIT = 1;
const ELLIPSIS = "…";

export interface SearchNotesInput {
    readonly query: string;
    readonly limit?: number;
}

export interface SearchResult {
    readonly path: string;
    readonly heading: string;
    readonly snippet: string;
}

export class SearchNotes {
    constructor(private readonly index: SearchIndex) {}

    async execute(input: SearchNotesInput): Promise<SearchResult[]> {
        const query = SearchQuery.of(input.query);
        const hits = await this.index.search(query, this.clampLimit(input.limit));
        return hits.map((hit) => this.toResult(hit));
    }

    private clampLimit(limit: number | undefined): number {
        if (limit === undefined || !Number.isFinite(limit)) return DEFAULT_SEARCH_LIMIT;
        const wanted = Math.floor(limit);
        return Math.min(MAX_SEARCH_LIMIT, Math.max(MIN_SEARCH_LIMIT, wanted));
    }

    private toResult(hit: SearchHit): SearchResult {
        return { path: hit.path.value, heading: hit.heading, snippet: this.shorten(hit.snippet) };
    }

    private shorten(snippet: string): string {
        if (snippet.length <= SNIPPET_MAX_CHARS) return snippet;
        const end = safeCutIndex(snippet, SNIPPET_MAX_CHARS - ELLIPSIS.length);
        return `${snippet.slice(0, end)}${ELLIPSIS}`;
    }
}
