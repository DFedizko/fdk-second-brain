import { D1SearchIndex } from "../../../../src/adapters/outbound/d1-search/d1-search-index";
import { NotePath } from "../../../../src/domain/note-path";
import { NoteVersion } from "../../../../src/domain/note-version";
import { SearchQuery } from "../../../../src/domain/search-query";
import { LocalRuntime } from "../../../shared/adapters/local-runtime";
import { SpyIndexFailureLog } from "../../../__spy__/spy-index-failure-log";

const LIMIT = 10;
const VERSION = NoteVersion.of("aaa111");
const PLAN = NotePath.of("work/plan.md");
const BAD_PATH = "work/plan.txt";
const INSERT_RAW_CHUNK =
  "INSERT INTO note_chunks (path, heading, seq, text) VALUES (?1, 'Steps', 0, 'deploy the worker')";

describe("D1SearchIndex with a row it can't read", () => {
  let runtime: LocalRuntime | undefined;
  let log: SpyIndexFailureLog;
  let index: D1SearchIndex;

  beforeEach(async () => {
    runtime = await LocalRuntime.start();
    await runtime.migrate();
    const database = await runtime.database();
    log = new SpyIndexFailureLog();
    index = new D1SearchIndex(database, log);
    await database.prepare(INSERT_RAW_CHUNK).bind(BAD_PATH).run();
    await index.replace(PLAN, VERSION, [{ heading: "Steps", seq: 0, text: "deploy it" }], null);
  });

  afterEach(async () => {
    await runtime?.stop();
    runtime = undefined;
  });

  it("skips the row and still returns the other hits", async () => {
    const hits = await index.search(SearchQuery.of("deploy"), LIMIT);

    expect(hits.map((hit) => hit.path.value)).toEqual([PLAN.value]);
  });

  it("logs the stored path it skipped", async () => {
    await index.search(SearchQuery.of("deploy"), LIMIT);

    expect(log.reported.map((failure) => failure.path)).toEqual([BAD_PATH]);
  });
});
