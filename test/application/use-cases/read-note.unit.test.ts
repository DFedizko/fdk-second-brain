import { ReadNote } from "../../../src/application/use-cases/read-note";
import { NotePath } from "../../../src/domain/note-path";
import { InvalidPath } from "../../../src/domain/errors/invalid-path";
import { NoteNotFound } from "../../../src/domain/errors/note-not-found";
import { InMemoryNoteRepo } from "../__fake__/in-memory-note-repo";

const PATH = "projects/plan.md";
const CONTENT = "# Plan\n\n- ship it\n";

describe("ReadNote", () => {
  let repository: InMemoryNoteRepo;
  let readNote: ReadNote;

  beforeEach(() => {
    repository = new InMemoryNoteRepo();
    readNote = new ReadNote(repository);
  });

  it("returns the content and its version", async () => {
    const created = await repository.create(NotePath.of(PATH), CONTENT);

    const note = await readNote.execute({ path: PATH });

    expect(note).toEqual({ path: PATH, content: CONTENT, version: created.version.value });
  });

  it("rejects a missing note", async () => {
    const read = readNote.execute({ path: PATH });

    await expect(read).rejects.toThrow(NoteNotFound);
  });

  it("rejects an invalid path", async () => {
    const read = readNote.execute({ path: "../outside.md" });

    await expect(read).rejects.toThrow(InvalidPath);
  });
});
