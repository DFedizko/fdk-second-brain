const DELETE_CHUNKS = "DELETE FROM note_chunks WHERE path = ?1";
const INSERT_CHUNK = "INSERT INTO note_chunks (path, heading, seq, text) VALUES (?1, ?2, 0, ?3)";
const UPSERT_VERSION =
    "INSERT INTO index_manifest (path, version) VALUES (?1, ?2) ON CONFLICT (path) DO UPDATE SET version = excluded.version";
const STALE_VERSION = "5555555555555555555555555555555555555555";

export class StaleIndexRows {
    constructor(private readonly database: D1Database) {}

    async plant(path: string, heading: string, text: string): Promise<void> {
        await this.database.batch([
            this.database.prepare(DELETE_CHUNKS).bind(path),
            this.database.prepare(INSERT_CHUNK).bind(path, heading, text),
            this.database.prepare(UPSERT_VERSION).bind(path, STALE_VERSION),
        ]);
    }
}
