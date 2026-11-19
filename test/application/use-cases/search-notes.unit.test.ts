import {
  DEFAULT_SEARCH_LIMIT,
  MAX_SEARCH_LIMIT,
  SNIPPET_MAX_CHARS,
  SearchNotes,
} from "../../../src/application/use-cases/search-notes";
import { EmptySearchQuery } from "../../../src/domain/errors/empty-search-query";
import { NotePath } from "../../../src/domain/note-path";
import { NoteVersion } from "../../../src/domain/note-version";
import { InMemorySearchIndex } from "./__fake__/in-memory-search-index";

const VERSION = NoteVersion.of("aaa111");
const MANY_NOTES = 30;
const ELLIPSIS = "…";
const LONG_TEXT_CHARS = 1000;
const ASKED_LIMIT = 12;
const TOO_MANY = 500;
const BELOW_ONE = 0;

describe("SearchNotes", () => {
  let index: InMemorySearchIndex;
  let searchNotes: SearchNotes;

  beforeEach(() => {
    index = new InMemorySearchIndex();
    searchNotes = new SearchNotes(index);
  });

  const indexNote = (path: string, heading: string, text: string) =>
    index.replace(NotePath.of(path), VERSION, [{ heading, seq: 0, text }]);

  const indexManyNotes = () =>
    Promise.all(
      Array.from({ length: MANY_NOTES }, (_, n) => indexNote(`notes/n${n}.md`, "Log", "deploy")),
    );

  it("returns the path, heading and snippet of each match", async () => {
    await indexNote("work/deploy.md", "Steps", "deploy the worker");
    await indexNote("home/garden.md", "Spring", "plant tomatoes");

    const results = await searchNotes.execute({ query: "deploy" });

    expect(results).toEqual([
      { path: "work/deploy.md", heading: "Steps", snippet: "deploy the worker" },
    ]);
  });

  it("returns the default number of results when no limit is given", async () => {
    await indexManyNotes();

    const results = await searchNotes.execute({ query: "deploy" });

    expect(results).toHaveLength(DEFAULT_SEARCH_LIMIT);
  });

  it("returns as many results as asked for", async () => {
    await indexManyNotes();

    const results = await searchNotes.execute({ query: "deploy", limit: ASKED_LIMIT });

    expect(results).toHaveLength(ASKED_LIMIT);
  });

  it("never returns more than the maximum", async () => {
    await indexManyNotes();

    const results = await searchNotes.execute({ query: "deploy", limit: TOO_MANY });

    expect(results).toHaveLength(MAX_SEARCH_LIMIT);
  });

  it("returns at least one result when the limit is below one", async () => {
    await indexManyNotes();

    const results = await searchNotes.execute({ query: "deploy", limit: BELOW_ONE });

    expect(results).toHaveLength(1);
  });

  it("shortens a long snippet", async () => {
    await indexNote("work/long.md", "Log", `deploy ${"x".repeat(LONG_TEXT_CHARS)}`);

    const [result] = await searchNotes.execute({ query: "deploy" });

    expect(result!.snippet).toHaveLength(SNIPPET_MAX_CHARS);
    expect(result!.snippet.endsWith(ELLIPSIS)).toBe(true);
  });

  it("rejects a query with no words", async () => {
    const run = searchNotes.execute({ query: "?!" });

    await expect(run).rejects.toThrow(EmptySearchQuery);
  });
});
