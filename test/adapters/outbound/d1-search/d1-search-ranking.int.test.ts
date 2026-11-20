import { SpyIndexFailureLog } from "../../../__spy__/spy-index-failure-log";
import { D1SearchIndex } from "../../../../src/adapters/outbound/d1-search/d1-search-index";
import type { MarkdownChunk } from "../../../../src/domain/markdown-chunk";
import { NotePath } from "../../../../src/domain/note-path";
import { NoteVersion } from "../../../../src/domain/note-version";
import { SearchQuery } from "../../../../src/domain/search-query";
import { LocalRuntime } from "../../../shared/adapters/local-runtime";

const LIMIT = 5;
const VERSION = NoteVersion.of("aaa111");
const PLAN = NotePath.of("work/plan.md");
const GARDEN = NotePath.of("home/garden.md");
const ALPHA = NotePath.of("alpha.md");
const ZETA = NotePath.of("zeta.md");
const SAME: MarkdownChunk[] = [{ heading: "Log", seq: 0, text: "deploy the worker" }];

const chunk = (heading: string, text: string, seq: number): MarkdownChunk => ({
  heading,
  seq,
  text,
});

describe("D1SearchIndex ranking", () => {
  let runtime: LocalRuntime | undefined;
  let index: D1SearchIndex;

  beforeEach(async () => {
    runtime = await LocalRuntime.start();
    await runtime.migrate();
    index = new D1SearchIndex(await runtime.database(), new SpyIndexFailureLog());
  });

  afterEach(async () => {
    await runtime?.stop();
    runtime = undefined;
  });

  const search = (raw: string) => index.search(SearchQuery.of(raw), LIMIT);

  it("returns each note once, with its best chunk", async () => {
    await index.replace(
      PLAN,
      VERSION,
      [
        chunk("Notes", "a long note that mentions deploy once among many other words", 0),
        chunk("Deploy", "deploy steps: deploy the worker", 1),
        chunk("Later", "maybe deploy again next week, once the rest is done", 2),
      ],
      null,
    );
    await index.replace(GARDEN, VERSION, [chunk("Spring", "deploy a sensor", 0)], null);

    const hits = await search("deploy");

    expect(hits.map((hit) => [hit.path.value, hit.heading])).toEqual([
      [PLAN.value, "Deploy"],
      [GARDEN.value, "Spring"],
    ]);
  });

  it("orders notes with equal scores by path", async () => {
    await index.replace(ZETA, VERSION, SAME, null);
    await index.replace(ALPHA, VERSION, SAME, null);

    const hits = await search("deploy");

    expect(hits.map((hit) => hit.path.value)).toEqual([ALPHA.value, ZETA.value]);
  });
});
