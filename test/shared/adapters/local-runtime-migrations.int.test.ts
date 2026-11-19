import { LocalRuntime } from "./local-runtime";

const LIST_TABLES = "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name";
const CHUNKS_TABLE = "note_chunks";
const FTS_TABLE = "note_chunks_fts";
const MANIFEST_TABLE = "index_manifest";

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
});
