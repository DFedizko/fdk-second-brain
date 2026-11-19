import { D1SearchIndex } from "../../../../src/adapters/outbound/d1-search/d1-search-index";
import type { MarkdownChunk } from "../../../../src/domain/markdown-chunk";
import { NotePath } from "../../../../src/domain/note-path";
import { NoteVersion } from "../../../../src/domain/note-version";
import { SearchQuery } from "../../../../src/domain/search-query";
import { LocalRuntime } from "../../../shared/adapters/local-runtime";

const LIMIT = 10;
const FIRST_VERSION = NoteVersion.of("aaa111");
const SECOND_VERSION = NoteVersion.of("bbb222");
const STALE_VERSION = NoteVersion.of("ccc333");
const PLAN = NotePath.of("work/plan.md");
const NEWER: MarkdownChunk[] = [{ heading: "Steps", seq: 0, text: "deploy the worker" }];
const OLDER: MarkdownChunk[] = [{ heading: "Steps", seq: 0, text: "migrate the database" }];

describe("D1SearchIndex writes only over the version it expects", () => {
  let runtime: LocalRuntime | undefined;
  let index: D1SearchIndex;

  beforeEach(async () => {
    runtime = await LocalRuntime.start();
    await runtime.migrate();
    index = new D1SearchIndex(await runtime.database());
  });

  afterEach(async () => {
    await runtime?.stop();
    runtime = undefined;
  });

  const pathsFor = async (raw: string) =>
    (await index.search(SearchQuery.of(raw), LIMIT)).map((hit) => hit.path.value);

  it("reports a replace over the expected version as applied", async () => {
    await index.replace(PLAN, FIRST_VERSION, OLDER, null);

    const applied = await index.replace(PLAN, SECOND_VERSION, NEWER, FIRST_VERSION);

    expect(applied).toBe(true);
  });

  it("refuses a replace when the index moved on", async () => {
    await index.replace(PLAN, SECOND_VERSION, NEWER, null);

    const applied = await index.replace(PLAN, STALE_VERSION, OLDER, FIRST_VERSION);

    expect({ applied, version: (await index.versionOf(PLAN))?.value }).toEqual({
      applied: false,
      version: SECOND_VERSION.value,
    });
  });

  it("keeps the newer chunks when a replace is refused", async () => {
    await index.replace(PLAN, SECOND_VERSION, NEWER, null);

    await index.replace(PLAN, STALE_VERSION, OLDER, FIRST_VERSION);

    expect({ newer: await pathsFor("deploy"), older: await pathsFor("migrate") }).toEqual({
      newer: [PLAN.value],
      older: [],
    });
  });

  it("refuses a first index when another one got there first", async () => {
    await index.replace(PLAN, SECOND_VERSION, NEWER, null);

    const applied = await index.replace(PLAN, STALE_VERSION, OLDER, null);

    expect(applied).toBe(false);
  });

  it("refuses a remove when the index moved on", async () => {
    await index.replace(PLAN, SECOND_VERSION, NEWER, null);

    const applied = await index.remove(PLAN, FIRST_VERSION);

    expect({ applied, hits: await pathsFor("deploy") }).toEqual({
      applied: false,
      hits: [PLAN.value],
    });
  });

  it("reports a remove of the expected version as applied", async () => {
    await index.replace(PLAN, FIRST_VERSION, NEWER, null);

    const applied = await index.remove(PLAN, FIRST_VERSION);

    expect(applied).toBe(true);
  });
});
