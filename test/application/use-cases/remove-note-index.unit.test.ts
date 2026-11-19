import { RemoveNoteIndex } from "../../../src/application/use-cases/remove-note-index";
import type { MarkdownChunk } from "../../../src/domain/markdown-chunk";
import { NotePath } from "../../../src/domain/note-path";
import { NoteVersion } from "../../../src/domain/note-version";
import { InMemorySearchIndex } from "./__fake__/in-memory-search-index";

const PATH = "projects/plan.md";
const VERSION = "aaa111";
const CHUNKS: MarkdownChunk[] = [{ heading: "Plan", seq: 0, text: "ship it" }];

describe("RemoveNoteIndex", () => {
  let index: InMemorySearchIndex;
  let removeNoteIndex: RemoveNoteIndex;

  beforeEach(() => {
    index = new InMemorySearchIndex();
    removeNoteIndex = new RemoveNoteIndex(index);
  });

  it("removes the note's chunks", async () => {
    await index.replace(NotePath.of(PATH), NoteVersion.of(VERSION), CHUNKS);

    await removeNoteIndex.execute({ path: PATH });

    expect(index.chunksOf(PATH)).toEqual([]);
  });

  it("forgets the note's indexed version", async () => {
    await index.replace(NotePath.of(PATH), NoteVersion.of(VERSION), CHUNKS);

    await removeNoteIndex.execute({ path: PATH });

    await expect(index.versionOf(NotePath.of(PATH))).resolves.toBeNull();
  });

  it("accepts a note that was never indexed", async () => {
    const run = removeNoteIndex.execute({ path: PATH });

    await expect(run).resolves.toBeUndefined();
  });
});
