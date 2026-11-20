import type { IndexFailureLog } from "../../../application/ports/index-failure-log";
import type { NoteCatalog, NoteStamp } from "../../../application/ports/note-catalog";
import { NotePath } from "../../../domain/note-path";
import { NoteVersion } from "../../../domain/note-version";
import { SELECT_MANIFEST } from "./d1-search-sql";

interface ManifestRow {
    readonly path: string;
    readonly version: string;
}

export class D1IndexManifest implements NoteCatalog {
    constructor(
        private readonly database: D1Database,
        private readonly log: IndexFailureLog,
    ) {}

    async stamps(): Promise<NoteStamp[]> {
        const { results } = await this.database.prepare(SELECT_MANIFEST).all<ManifestRow>();
        return results.flatMap((row) => this.readStamp(row));
    }

    private readStamp(row: ManifestRow): NoteStamp[] {
        try {
            return [{ path: NotePath.of(row.path), version: NoteVersion.of(row.version) }];
        } catch (error) {
            this.log.report({ path: row.path, error });
            return [];
        }
    }
}
