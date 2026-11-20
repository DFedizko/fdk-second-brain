import { IndexNote } from "../../../src/application/use-cases/index-note";
import { MarkdownChunker } from "../../../src/domain/markdown-chunker";
import { NotePath } from "../../../src/domain/note-path";
import { NoteVersion } from "../../../src/domain/note-version";
import { InMemoryNoteRepo } from "../__fake__/in-memory-note-repo";
import { InMemorySearchIndex } from "./__fake__/in-memory-search-index";

const PATH = "projects/plan.md";
const NOTE = NotePath.of(PATH);
const SAVED = { content: "# Plan\nship the search", version: "ccc333" };
const SAVED_CHUNKS = [{ heading: "Plan", seq: 0, text: "ship the search" }];
const STALE_VERSION = NoteVersion.of("aaa111");
const STALE_CHUNKS = [{ heading: "Plan", seq: 0, text: "stale words" }];

describe("IndexNote given the saved note", () => {
  let index: InMemorySearchIndex;
  let indexNote: IndexNote;

  beforeEach(() => {
    index = new InMemorySearchIndex();
    indexNote = new IndexNote(index, new InMemoryNoteRepo(), new MarkdownChunker());
  });

  it("indexes the saved content without reading the repository", async () => {
    const result = await indexNote.execute({ path: PATH, saved: SAVED });

    expect({ result, chunks: index.chunksOf(PATH) }).toEqual({
      result: { path: PATH, status: "indexed" },
      chunks: SAVED_CHUNKS,
    });
  });

  it("stores the saved version", async () => {
    await indexNote.execute({ path: PATH, saved: SAVED });

    const version = await index.versionOf(NOTE);

    expect(version?.value).toBe(SAVED.version);
  });

  it("skips a saved version that is already indexed", async () => {
    await indexNote.execute({ path: PATH, saved: SAVED });

    const result = await indexNote.execute({ path: PATH, saved: SAVED });

    expect(result).toEqual({ path: PATH, status: "unchanged" });
  });

  it("writes again when another indexer changed the index first", async () => {
    index.beforeNextWrites(async () => {
      await index.replace(NOTE, STALE_VERSION, STALE_CHUNKS, null);
    });

    await indexNote.execute({ path: PATH, saved: SAVED });

    expect(index.chunksOf(PATH)).toEqual(SAVED_CHUNKS);
  });
});
