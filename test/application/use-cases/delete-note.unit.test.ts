import { DeleteNote } from "../../../src/application/use-cases/delete-note";
import { NotePath } from "../../../src/domain/note-path";
import { InvalidPath } from "../../../src/domain/errors/invalid-path";
import { NoteNotFound } from "../../../src/domain/errors/note-not-found";
import { InMemoryNoteRepo } from "../__fake__/in-memory-note-repo";

const PATH = "projects/plan.md";
const CONTENT = "# Plan\n";
const OUTSIDE_PATH = "/etc/passwd";

describe("DeleteNote", () => {
  let repository: InMemoryNoteRepo;
  let deleteNote: DeleteNote;

  beforeEach(() => {
    repository = new InMemoryNoteRepo();
    deleteNote = new DeleteNote(repository);
  });

  it("deletes the note", async () => {
    await repository.create(NotePath.of(PATH), CONTENT);
    await deleteNote.execute({ path: PATH });

    const read = repository.read(NotePath.of(PATH));

    await expect(read).rejects.toThrow(NoteNotFound);
  });

  it("rejects a missing note", async () => {
    const remove = deleteNote.execute({ path: PATH });

    await expect(remove).rejects.toThrow(NoteNotFound);
  });

  it("rejects an invalid path", async () => {
    const remove = deleteNote.execute({ path: OUTSIDE_PATH });

    await expect(remove).rejects.toThrow(InvalidPath);
  });
});
