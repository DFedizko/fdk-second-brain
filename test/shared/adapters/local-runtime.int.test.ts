import { LocalRuntime } from "./local-runtime";

const CREATE_NOTES_INDEX = "CREATE VIRTUAL TABLE notes USING fts5(path, body)";
const INSERT_NOTE = "INSERT INTO notes (path, body) VALUES (?, ?)";
const SEARCH_NOTES = "SELECT path, snippet(notes, 1, '[', ']', '…', 4) AS excerpt FROM notes WHERE notes MATCH ?";
const MATCHING_PATH = "ideas/garden.md";
const MATCHING_BODY = "Plant tomatoes along the sunny fence in spring";
const OTHER_PATH = "work/meeting.md";
const OTHER_BODY = "Quarterly planning with the platform team";
const SEARCH_TERM = "tomatoes";
const MATCHING_EXCERPT = "Plant [tomatoes] along the…";
const LIST_TABLES = "SELECT name FROM sqlite_master";
const PING = "SELECT 1";

describe("LocalRuntime", () => {
    let runtime: LocalRuntime | undefined;

    beforeEach(async () => {
        runtime = await LocalRuntime.start();
    });

    afterEach(async () => {
        await runtime?.stop();
        runtime = undefined;
    });

    it("runs a full-text search on a local D1 database", async () => {
        const database = await runtime!.database();
        await database.exec(CREATE_NOTES_INDEX);
        await database.batch([
            database.prepare(INSERT_NOTE).bind(MATCHING_PATH, MATCHING_BODY),
            database.prepare(INSERT_NOTE).bind(OTHER_PATH, OTHER_BODY),
        ]);

        const { results } = await database.prepare(SEARCH_NOTES).bind(SEARCH_TERM).all();

        expect(results).toEqual([{ path: MATCHING_PATH, excerpt: MATCHING_EXCERPT }]);
    });

    it("starts each runtime with an empty database", async () => {
        const database = await runtime!.database();

        const { results } = await database.prepare(LIST_TABLES).all();

        expect(results).toEqual([]);
    });

    it("exposes the bindings declared in wrangler.jsonc", async () => {
        const bindings = runtime!.bindings();

        expect(bindings.INDEX_QUEUE).toBeDefined();
    });
});

describe("LocalRuntime.stop", () => {
    let runtime: LocalRuntime | undefined;

    beforeEach(async () => {
        runtime = await LocalRuntime.start();
    });

    afterEach(async () => {
        await runtime?.stop();
        runtime = undefined;
    });

    it("shuts the runtime down so its database can no longer be used", async () => {
        const database = await runtime!.database();

        await runtime!.stop();

        expect(() => database.prepare(PING)).toThrow();
    });

    it("can be called again after the runtime has stopped", async () => {
        await runtime!.stop();

        const stopAgain = runtime!.stop();

        await expect(stopAgain).resolves.toBeUndefined();
    });
});
