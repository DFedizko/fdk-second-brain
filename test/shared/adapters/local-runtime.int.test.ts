import { LocalRuntime } from "./local-runtime";

const CREATE_NOTES_INDEX = "CREATE VIRTUAL TABLE notes USING fts5(path, body)";
const INSERT_NOTE = "INSERT INTO notes (path, body) VALUES (?, ?)";
const SEARCH_NOTES =
  "SELECT path, snippet(notes, 1, '[', ']', '…', 4) AS excerpt FROM notes WHERE notes MATCH ?";
const MATCHING_PATH = "ideas/garden.md";
const MATCHING_BODY = "Plant tomatoes along the sunny fence in spring";
const OTHER_PATH = "work/meeting.md";
const OTHER_BODY = "Quarterly planning with the platform team";
const SEARCH_TERM = "tomatoes";
const LIST_TABLES = "SELECT name FROM sqlite_master";
const PING = "SELECT 1";

describe("LocalRuntime", () => {
  let runtime: LocalRuntime;

  beforeEach(async () => {
    runtime = await LocalRuntime.start();
  });

  afterEach(async () => {
    await runtime.stop();
  });

  it("runs a full-text search on a local D1 database", async () => {
    const database = await runtime.database();
    await database.exec(CREATE_NOTES_INDEX);
    await database.batch([
      database.prepare(INSERT_NOTE).bind(MATCHING_PATH, MATCHING_BODY),
      database.prepare(INSERT_NOTE).bind(OTHER_PATH, OTHER_BODY),
    ]);

    const { results } = await database.prepare(SEARCH_NOTES).bind(SEARCH_TERM).all();

    expect(results).toEqual([
      { path: MATCHING_PATH, excerpt: "Plant [tomatoes] along the sunny…" },
    ]);
  });

  it("starts each runtime with an empty database", async () => {
    const database = await runtime.database();

    const { results } = await database.prepare(LIST_TABLES).all();

    expect(results).toEqual([]);
  });
});

describe("LocalRuntime.stop", () => {
  it("shuts the runtime down so its database is no longer reachable", async () => {
    const runtime = await LocalRuntime.start();
    const database = await runtime.database();

    await runtime.stop();

    await expect(database.prepare(PING).all()).rejects.toThrow();
  });
});
