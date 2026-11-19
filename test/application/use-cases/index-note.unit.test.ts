import { IndexNote } from "../../../src/application/use-cases/index-note";
import { MarkdownChunker } from "../../../src/domain/markdown-chunker";
import { InvalidPath } from "../../../src/domain/errors/invalid-path";
import { InMemorySearchIndex } from "./__fake__/in-memory-search-index";

const PATH = "projects/plan.md";
const FIRST_VERSION = "aaa111";
const SECOND_VERSION = "bbb222";
const FIRST_CONTENT = "# Plan\nship the search";
const SECOND_CONTENT = "# Plan\nship the sync";

describe("IndexNote", () => {
  let index: InMemorySearchIndex;
  let indexNote: IndexNote;

  beforeEach(() => {
    index = new InMemorySearchIndex();
    indexNote = new IndexNote(index, new MarkdownChunker());
  });

  it("stores the note's chunks", async () => {
    await indexNote.execute({ path: PATH, content: FIRST_CONTENT, version: FIRST_VERSION });

    expect(index.chunksOf(PATH)).toEqual([{ heading: "Plan", seq: 0, text: "ship the search" }]);
  });

  it("reports a note it indexed", async () => {
    const result = await indexNote.execute({
      path: PATH,
      content: FIRST_CONTENT,
      version: FIRST_VERSION,
    });

    expect(result).toEqual({ path: PATH, status: "indexed" });
  });

  it("skips a note whose version is already indexed", async () => {
    await indexNote.execute({ path: PATH, content: FIRST_CONTENT, version: FIRST_VERSION });

    const result = await indexNote.execute({
      path: PATH,
      content: SECOND_CONTENT,
      version: FIRST_VERSION,
    });

    expect(result).toEqual({ path: PATH, status: "unchanged" });
    expect(index.chunksOf(PATH)[0]?.text).toBe("ship the search");
  });

  it("replaces the chunks of a note whose version changed", async () => {
    await indexNote.execute({ path: PATH, content: FIRST_CONTENT, version: FIRST_VERSION });

    await indexNote.execute({ path: PATH, content: SECOND_CONTENT, version: SECOND_VERSION });

    expect(index.chunksOf(PATH)).toEqual([{ heading: "Plan", seq: 0, text: "ship the sync" }]);
  });

  it("rejects a path that is not a note", async () => {
    const run = indexNote.execute({
      path: "plan.txt",
      content: FIRST_CONTENT,
      version: FIRST_VERSION,
    });

    await expect(run).rejects.toThrow(InvalidPath);
  });
});
