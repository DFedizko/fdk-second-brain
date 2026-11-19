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

interface HitRow {
  readonly path: string;
  readonly heading: string;
  readonly snippet: string;
}

interface VersionRow {
  readonly version: string;
}

export class D1SearchIndex implements SearchIndex {
  constructor(private readonly database: D1Database) {}

  async search(query: SearchQuery, limit: number): Promise<SearchHit[]> {
    const statement = this.database.prepare(SEARCH_CHUNKS);
    const { results } = await statement.bind(this.buildMatch(query), limit).all<HitRow>();
    return results.map((row) => this.toHit(row));
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
  ): Promise<void> {
    await this.database.batch([
      this.database.prepare(DELETE_CHUNKS).bind(path.value),
      ...chunks.map((chunk) => this.insertChunk(path, version, chunk)),
      this.database.prepare(UPSERT_VERSION).bind(path.value, version.value),
    ]);
  }

  async remove(path: NotePath): Promise<void> {
    await this.database.batch([
      this.database.prepare(DELETE_CHUNKS).bind(path.value),
      this.database.prepare(DELETE_VERSION).bind(path.value),
    ]);
  }

  private buildMatch(query: SearchQuery): string {
    return query.terms.map((term) => `"${term}"*`).join(ANY_TERM);
  }

  private insertChunk(path: NotePath, version: NoteVersion, chunk: MarkdownChunk) {
    const values = [path.value, chunk.heading, chunk.seq, chunk.text, version.value];
    return this.database.prepare(INSERT_CHUNK).bind(...values);
  }

  private toHit(row: HitRow): SearchHit {
    return { path: NotePath.of(row.path), heading: row.heading, snippet: row.snippet };
  }
}
