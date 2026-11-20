import type { IndexFailureLog } from "../../../application/ports/index-failure-log";
import type { SearchHit, SearchIndex } from "../../../application/ports/search-index";
import type { MarkdownChunk } from "../../../domain/markdown-chunk";
import { NotePath } from "../../../domain/note-path";
import { NoteVersion } from "../../../domain/note-version";
import type { SearchQuery } from "../../../domain/search-query";
import {
    DELETE_CHUNKS,
    DELETE_VERSION,
    INSERT_CHUNK,
    SEARCH_CHUNKS,
    SELECT_VERSION,
    UPSERT_VERSION,
} from "./d1-search-sql";

const ANY_TERM = " OR ";
const MIN_PREFIX_CHARS = 2;

interface HitRow {
    readonly path: string;
    readonly heading: string;
    readonly snippet: string;
}

type Guard = readonly [string, string | null];

interface VersionRow {
    readonly version: string;
}

export class D1SearchIndex implements SearchIndex {
    constructor(
        private readonly database: D1Database,
        private readonly log: IndexFailureLog,
    ) {}

    async search(query: SearchQuery, limit: number): Promise<SearchHit[]> {
        const statement = this.database.prepare(SEARCH_CHUNKS);
        const { results } = await statement.bind(this.buildMatch(query), limit).all<HitRow>();
        return results.flatMap((row) => this.readHit(row));
    }

    async versionOf(path: NotePath): Promise<NoteVersion | null> {
        const statement = this.database.prepare(SELECT_VERSION).bind(path.value);
        const row = await statement.first<VersionRow>();
        return row ? NoteVersion.of(row.version) : null;
    }

    async replace(
        path: NotePath,
        version: NoteVersion,
        chunks: readonly MarkdownChunk[],
        expected: NoteVersion | null,
    ): Promise<boolean> {
        const guard = [path.value, expected?.value ?? null] as const;
        const results = await this.database.batch([
            this.database.prepare(DELETE_CHUNKS).bind(...guard),
            ...chunks.map((chunk) => this.insertChunk(guard, chunk)),
            this.database.prepare(UPSERT_VERSION).bind(...guard, version.value),
        ]);
        return this.lastApplied(results);
    }

    async remove(path: NotePath, expected: NoteVersion | null): Promise<boolean> {
        const guard = [path.value, expected?.value ?? null] as const;
        const results = await this.database.batch([
            this.database.prepare(DELETE_CHUNKS).bind(...guard),
            this.database.prepare(DELETE_VERSION).bind(...guard),
        ]);
        return this.lastApplied(results);
    }

    private buildMatch(query: SearchQuery): string {
        return query.terms.map((term) => this.matchTerm(term)).join(ANY_TERM);
    }

    private matchTerm(term: string): string {
        return Array.from(term).length < MIN_PREFIX_CHARS ? `"${term}"` : `"${term}"*`;
    }

    private insertChunk(guard: Guard, chunk: MarkdownChunk) {
        const values = [chunk.heading, chunk.seq, chunk.text];
        return this.database.prepare(INSERT_CHUNK).bind(...guard, ...values);
    }

    private lastApplied(results: readonly D1Result[]): boolean {
        return (results.at(-1)?.meta.changes ?? 0) > 0;
    }

    private readHit(row: HitRow): SearchHit[] {
        try {
            return [{ path: NotePath.of(row.path), heading: row.heading, snippet: row.snippet }];
        } catch (error) {
            this.log.report({ path: row.path, error });
            return [];
        }
    }
}
