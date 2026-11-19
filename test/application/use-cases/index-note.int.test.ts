import { D1SearchIndex } from "../../../src/adapters/outbound/d1-search/d1-search-index";
import { IndexNote } from "../../../src/application/use-cases/index-note";
import { SearchNotes } from "../../../src/application/use-cases/search-notes";
import { MarkdownChunker } from "../../../src/domain/markdown-chunker";
import { LocalRuntime } from "../../shared/adapters/local-runtime";

const PATH = "work/plan.md";
const VERSION = "aaa111";
const INDEXED_CONTENT = "# Plan\nship the search";
const UNSEEN_CONTENT = "# Plan\nship the sync";

describe("IndexNote on D1", () => {
  let runtime: LocalRuntime | undefined;
  let indexNote: IndexNote;
  let searchNotes: SearchNotes;

  beforeEach(async () => {
    runtime = await LocalRuntime.start();
    await runtime.migrate();
    const index = new D1SearchIndex(await runtime.database());
    indexNote = new IndexNote(index, new MarkdownChunker());
    searchNotes = new SearchNotes(index);
  });

  afterEach(async () => {
    await runtime?.stop();
    runtime = undefined;
  });

  it("skips a note whose version the manifest already holds", async () => {
    await indexNote.execute({ path: PATH, content: INDEXED_CONTENT, version: VERSION });

    const result = await indexNote.execute({
      path: PATH,
      content: UNSEEN_CONTENT,
      version: VERSION,
    });

    expect(result.status).toBe("unchanged");
    expect(await searchNotes.execute({ query: "sync" })).toEqual([]);
  });

  it("makes an indexed note searchable", async () => {
    await indexNote.execute({ path: PATH, content: INDEXED_CONTENT, version: VERSION });

    const results = await searchNotes.execute({ query: "search" });

    expect(results).toEqual([{ path: PATH, heading: "Plan", snippet: "ship the search" }]);
  });
});
