import { D1IndexManifest } from "../../../../src/adapters/outbound/d1-search/d1-index-manifest";
import { D1SearchIndex } from "../../../../src/adapters/outbound/d1-search/d1-search-index";
import { NotePath } from "../../../../src/domain/note-path";
import { NoteVersion } from "../../../../src/domain/note-version";
import { LocalRuntime } from "../../../shared/adapters/local-runtime";
import { SpyIndexFailureLog } from "../../../__spy__/spy-index-failure-log";

const PLAN = NotePath.of("work/plan.md");
const IDEA = NotePath.of("ideas/idea.md");
const FIRST = NoteVersion.of("aaa111");
const SECOND = NoteVersion.of("bbb222");
const BAD_PATH = "work/plan.txt";
const INSERT_RAW_ENTRY = "INSERT INTO index_manifest (path, version) VALUES (?1, ?2)";
const CHUNK = { heading: "Plan", seq: 0, text: "ship it" };

describe("D1IndexManifest", () => {
  let runtime: LocalRuntime | undefined;
  let database: D1Database;
  let log: SpyIndexFailureLog;
  let index: D1SearchIndex;
  let manifest: D1IndexManifest;

  beforeEach(async () => {
    runtime = await LocalRuntime.start();
    await runtime.migrate();
    database = await runtime.database();
    log = new SpyIndexFailureLog();
    index = new D1SearchIndex(database, log);
    manifest = new D1IndexManifest(database, log);
  });

  afterEach(async () => {
    await runtime?.stop();
    runtime = undefined;
  });

  async function listed() {
    const stamps = await manifest.stamps();
    return stamps.map((stamp) => ({ path: stamp.path.value, version: stamp.version.value }));
  }

  it("lists every indexed note with its indexed version", async () => {
    await index.replace(PLAN, FIRST, [CHUNK], null);
    await index.replace(IDEA, SECOND, [CHUNK], null);

    const stamps = await listed();

    expect(stamps).toEqual([
      { path: IDEA.value, version: SECOND.value },
      { path: PLAN.value, version: FIRST.value },
    ]);
  });

  it("lists nothing when the index is empty", async () => {
    const stamps = await listed();

    expect(stamps).toEqual([]);
  });

  it("skips and reports an entry whose path is not a note", async () => {
    await database.prepare(INSERT_RAW_ENTRY).bind(BAD_PATH, FIRST.value).run();

    const stamps = await listed();

    expect({ stamps, reported: log.reported.map((failure) => failure.path) }).toEqual({
      stamps: [],
      reported: [BAD_PATH],
    });
  });
});
