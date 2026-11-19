import { WriteNote } from "../../../src/application/use-cases/write-note";
import { NotePath } from "../../../src/domain/note-path";
import { InvalidPath } from "../../../src/domain/errors/invalid-path";
import { NoteAlreadyExists } from "../../../src/domain/errors/note-already-exists";
import { NoteNotFound } from "../../../src/domain/errors/note-not-found";
import { VersionConflict } from "../../../src/domain/errors/version-conflict";
import { InMemoryNoteRepo } from "../__fake__/in-memory-note-repo";

const PATH = "projects/plan.md";
const CONTENT = "# Plan\n";
const NEW_CONTENT = "# Plan\n\n- ship it\n";
const STALE_VERSION = "stale";

describe("WriteNote", () => {
  let repository: InMemoryNoteRepo;
  let writeNote: WriteNote;

  beforeEach(() => {
    repository = new InMemoryNoteRepo();
    writeNote = new WriteNote(repository);
  });

  it("creates a note when no version is expected", async () => {
    await writeNote.execute({ path: PATH, content: CONTENT });

    const note = await repository.read(NotePath.of(PATH));

    expect(note.content).toBe(CONTENT);
  });

  it("returns the new note with its version", async () => {
    const written = await writeNote.execute({ path: PATH, content: CONTENT });

    const note = await repository.read(NotePath.of(PATH));

    expect(written).toEqual({ path: PATH, content: CONTENT, version: note.version.value });
  });

  it("refuses to create over an existing note", async () => {
    await repository.create(NotePath.of(PATH), CONTENT);

    const write = writeNote.execute({ path: PATH, content: NEW_CONTENT });

    await expect(write).rejects.toThrow(NoteAlreadyExists);
  });

  it("overwrites when the expected version matches", async () => {
    const created = await repository.create(NotePath.of(PATH), CONTENT);
    const expectedVersion = created.version.value;

    const written = await writeNote.execute({ path: PATH, content: NEW_CONTENT, expectedVersion });

    expect(written.content).toBe(NEW_CONTENT);
  });

  it("refuses to overwrite with a stale version", async () => {
    await repository.create(NotePath.of(PATH), CONTENT);

    const write = writeNote.execute({
      path: PATH,
      content: NEW_CONTENT,
      expectedVersion: STALE_VERSION,
    });

    await expect(write).rejects.toThrow(VersionConflict);
  });

  it("refuses to overwrite a missing note", async () => {
    const write = writeNote.execute({
      path: PATH,
      content: NEW_CONTENT,
      expectedVersion: STALE_VERSION,
    });

    await expect(write).rejects.toThrow(NoteNotFound);
  });

  it("rejects an invalid path", async () => {
    const write = writeNote.execute({ path: ".github/workflows/x.md", content: CONTENT });

    await expect(write).rejects.toThrow(InvalidPath);
  });
});
