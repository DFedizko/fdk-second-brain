import { MoveNote } from "../../../src/application/use-cases/move-note";
import { NotePath } from "../../../src/domain/note-path";
import { InvalidPath } from "../../../src/domain/errors/invalid-path";
import { NoteAlreadyExists } from "../../../src/domain/errors/note-already-exists";
import { NoteNotFound } from "../../../src/domain/errors/note-not-found";
import { InMemoryNoteRepo } from "../__fake__/in-memory-note-repo";

const FROM = "inbox.md";
const TO = "archive/inbox.md";
const CONTENT = "# Inbox\n";

describe("MoveNote", () => {
  let repository: InMemoryNoteRepo;
  let moveNote: MoveNote;

  beforeEach(() => {
    repository = new InMemoryNoteRepo();
    moveNote = new MoveNote(repository);
  });

  it("returns the note at its new path", async () => {
    const created = await repository.create(NotePath.of(FROM), CONTENT);

    const moved = await moveNote.execute({ from: FROM, to: TO });

    expect(moved).toEqual({ path: TO, content: CONTENT, version: created.version.value });
  });

  it("rejects a missing note", async () => {
    const move = moveNote.execute({ from: FROM, to: TO });

    await expect(move).rejects.toThrow(NoteNotFound);
  });

  it("refuses to move onto an existing note", async () => {
    await Promise.all([FROM, TO].map((raw) => repository.create(NotePath.of(raw), CONTENT)));

    const move = moveNote.execute({ from: FROM, to: TO });

    await expect(move).rejects.toThrow(NoteAlreadyExists);
  });

  it("rejects an invalid target path", async () => {
    await repository.create(NotePath.of(FROM), CONTENT);

    const move = moveNote.execute({ from: FROM, to: "archive/inbox.txt" });

    await expect(move).rejects.toThrow(InvalidPath);
  });
});
