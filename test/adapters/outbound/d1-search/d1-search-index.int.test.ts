import { D1SearchIndex } from "../../../../src/adapters/outbound/d1-search/d1-search-index";
import type { MarkdownChunk } from "../../../../src/domain/markdown-chunk";
import { NotePath } from "../../../../src/domain/note-path";
import { NoteVersion } from "../../../../src/domain/note-version";
import { SearchQuery } from "../../../../src/domain/search-query";
import { LocalRuntime } from "../../../shared/adapters/local-runtime";

const LIMIT = 10;
const FIRST_VERSION = NoteVersion.of("aaa111");
const SECOND_VERSION = NoteVersion.of("bbb222");
const PLAN = NotePath.of("work/plan.md");
const GARDEN = NotePath.of("home/garden.md");
const MANY_CHUNKS = 150;
const FILLER_REPEATS = 40;

const chunk = (heading: string, text: string, seq = 0): MarkdownChunk => ({ heading, seq, text });

describe("D1SearchIndex", () => {
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

  const search = (raw: string) => index.search(SearchQuery.of(raw), LIMIT);
  const pathsOf = (hits: { path: NotePath }[]) => hits.map((hit) => hit.path.value);

  it("finds a chunk by the start of a word", async () => {
    await index.replace(PLAN, FIRST_VERSION, [chunk("Steps", "deploy the worker")]);
    await index.replace(GARDEN, FIRST_VERSION, [chunk("Spring", "plant tomatoes")]);

    const hits = await search("depl");

    expect(hits).toEqual([{ path: PLAN, heading: "Steps", snippet: "deploy the worker" }]);
  });

  it("finds Portuguese words typed without accents", async () => {
    await index.replace(PLAN, FIRST_VERSION, [chunk("Decisões", "A decisão foi usar o D1")]);

    const hits = await search("decisao");

    expect(pathsOf(hits)).toEqual([PLAN.value]);
  });

  it("finds words written without accents when the query has them", async () => {
    await index.replace(PLAN, FIRST_VERSION, [chunk("Notas", "a decisao final")]);

    const hits = await search("DECISÃO");

    expect(pathsOf(hits)).toEqual([PLAN.value]);
  });

  it("finds a chunk by a word in its heading", async () => {
    await index.replace(PLAN, FIRST_VERSION, [chunk("Roadmap", "first quarter goals")]);

    const hits = await search("roadmap");

    expect(hits).toEqual([{ path: PLAN, heading: "Roadmap", snippet: "first quarter goals" }]);
  });

  it("ranks the chunk that matches best first", async () => {
    await index.replace(GARDEN, FIRST_VERSION, [
      chunk("Spring", "water the plants, maybe deploy a sensor some day, and pull the weeds"),
    ]);
    await index.replace(PLAN, FIRST_VERSION, [chunk("Deploy", "deploy steps: deploy the worker")]);

    const hits = await search("deploy");

    expect(pathsOf(hits)).toEqual([PLAN.value, GARDEN.value]);
  });

  it("matches any of the query's words", async () => {
    await index.replace(PLAN, FIRST_VERSION, [chunk("Steps", "deploy the worker")]);
    await index.replace(GARDEN, FIRST_VERSION, [chunk("Spring", "plant tomatoes")]);

    const hits = await search("tomatoes deploy");

    expect(pathsOf(hits).sort()).toEqual([GARDEN.value, PLAN.value]);
  });

  it("returns no more hits than the limit", async () => {
    const chunks = Array.from({ length: MANY_CHUNKS }, (_, seq) => chunk("Log", "deploy", seq));
    await index.replace(PLAN, FIRST_VERSION, chunks);

    const hits = await index.search(SearchQuery.of("deploy"), LIMIT);

    expect(hits).toHaveLength(LIMIT);
  });

  it("treats search operators as plain words", async () => {
    await index.replace(PLAN, FIRST_VERSION, [chunk("Logic", "NOT a gate, OR a wire")]);

    const hits = await search('NOT "OR');

    expect(pathsOf(hits)).toEqual([PLAN.value]);
  });

  it("shows a short snippet around the match", async () => {
    const filler = "lorem ipsum dolor sit amet ".repeat(FILLER_REPEATS);
    await index.replace(PLAN, FIRST_VERSION, [chunk("Long", `${filler}kubernetes ${filler}`)]);

    const [hit] = await search("kubernetes");

    expect(hit!.snippet).toContain("kubernetes");
    expect(hit!.snippet.length).toBeLessThan(filler.length);
  });

  it("replaces a note's old chunks when it is indexed again", async () => {
    await index.replace(PLAN, FIRST_VERSION, [chunk("Steps", "deploy the worker")]);

    await index.replace(PLAN, SECOND_VERSION, [chunk("Steps", "migrate the database")]);

    expect(await search("deploy")).toEqual([]);
    expect(pathsOf(await search("migrate"))).toEqual([PLAN.value]);
  });

  it("remembers the version it indexed", async () => {
    await index.replace(PLAN, SECOND_VERSION, [chunk("Steps", "deploy")]);

    const version = await index.versionOf(PLAN);

    expect(version?.value).toBe(SECOND_VERSION.value);
  });

  it("has no version for a note it never indexed", async () => {
    const version = await index.versionOf(PLAN);

    expect(version).toBeNull();
  });

  it("removes a note's chunks", async () => {
    await index.replace(PLAN, FIRST_VERSION, [chunk("Steps", "deploy the worker")]);

    await index.remove(PLAN);

    expect(await search("deploy")).toEqual([]);
  });

  it("forgets a removed note's version", async () => {
    await index.replace(PLAN, FIRST_VERSION, [chunk("Steps", "deploy the worker")]);

    await index.remove(PLAN);

    expect(await index.versionOf(PLAN)).toBeNull();
  });
});
