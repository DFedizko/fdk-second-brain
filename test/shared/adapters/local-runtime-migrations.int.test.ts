import { LocalRuntime } from "./local-runtime";

const LIST_TABLES = "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name";
const CHUNKS_TABLE = "note_chunks";
const FTS_TABLE = "note_chunks_fts";
const MANIFEST_TABLE = "index_manifest";
const CHUNK_COLUMNS = "SELECT name FROM pragma_table_info('note_chunks')";
const VERSION_COLUMN = "version";

describe("LocalRuntime.migrate", () => {
    let runtime: LocalRuntime | undefined;

    beforeEach(async () => {
        runtime = await LocalRuntime.start();
    });

    afterEach(async () => {
        await runtime?.stop();
        runtime = undefined;
    });

    it("applies the migrations in wrangler.jsonc to the local database", async () => {
        const database = await runtime!.database();

        await runtime!.migrate();

        const { results } = await database.prepare(LIST_TABLES).all<{ name: string }>();
        const names = results.map((row) => row.name);
        expect(names).toEqual(expect.arrayContaining([CHUNKS_TABLE, FTS_TABLE, MANIFEST_TABLE]));
    });

    it("leaves no version column on the chunks, as the manifest holds it", async () => {
        const database = await runtime!.database();

        await runtime!.migrate();

        const { results } = await database.prepare(CHUNK_COLUMNS).all<{ name: string }>();
        expect(results.map((row) => row.name)).not.toContain(VERSION_COLUMN);
    });

    it("can run twice on the same database", async () => {
        await runtime!.migrate();

        const again = runtime!.migrate();

        await expect(again).resolves.toBeUndefined();
    });
});
