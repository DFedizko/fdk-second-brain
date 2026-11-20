import { DropNoteIndex } from "../../../src/application/use-cases/drop-note-index";
import { NotePath } from "../../../src/domain/note-path";
import { NoteVersion } from "../../../src/domain/note-version";
import { InMemorySearchIndex } from "./__fake__/in-memory-search-index";

const PATH = "projects/plan.md";
const NOTE = NotePath.of(PATH);
const VERSION = NoteVersion.of("1111111111111111111111111111111111111111");

describe("DropNoteIndex", () => {
  let index: InMemorySearchIndex;

  beforeEach(() => {
    index = new InMemorySearchIndex();
  });

  it("removes the indexed entry of a path", async () => {
    await index.replace(NOTE, VERSION, [], null);

    await new DropNoteIndex(index).execute({ path: PATH });

    expect(await index.versionOf(NOTE)).toBeNull();
  });

  it("reports a removed entry", async () => {
    await index.replace(NOTE, VERSION, [], null);

    const result = await new DropNoteIndex(index).execute({ path: PATH });

    expect(result).toEqual({ path: PATH, status: "removed" });
  });

  it("leaves a path that was never indexed unchanged", async () => {
    const result = await new DropNoteIndex(index).execute({ path: PATH });

    expect(result).toEqual({ path: PATH, status: "unchanged" });
  });
});
