import { EditNote } from "../../../src/application/use-cases/edit-note";
import { NotePath } from "../../../src/domain/note-path";
import { NoteNotFound } from "../../../src/domain/errors/note-not-found";
import { PassageNotFound } from "../../../src/domain/errors/passage-not-found";
import { PassageNotUnique } from "../../../src/domain/errors/passage-not-unique";
import { VersionConflict } from "../../../src/domain/errors/version-conflict";
import { InMemoryNoteRepo } from "../__fake__/in-memory-note-repo";

const PATH = "projects/plan.md";
const CONTENT = "# Plan\n\n- buy milk\n- call Ana\n";
const EDITED = "# Plan\n\n- buy bread\n- call Ana\n";

describe("EditNote", () => {
  let repository: InMemoryNoteRepo;
  let editNote: EditNote;

  beforeEach(async () => {
    repository = new InMemoryNoteRepo();
    editNote = new EditNote(repository);
    await repository.create(NotePath.of(PATH), CONTENT);
  });

  it("replaces a passage that appears exactly once", async () => {
    await editNote.execute({ path: PATH, passage: "buy milk", replacement: "buy bread" });

    const note = await repository.read(NotePath.of(PATH));

    expect(note.content).toBe(EDITED);
  });

  it("returns the edited note with its new version", async () => {
    const edited = await editNote.execute({
      path: PATH,
      passage: "buy milk",
      replacement: "buy bread",
    });

    const note = await repository.read(NotePath.of(PATH));

    expect(edited).toEqual({ path: PATH, content: EDITED, version: note.version.value });
  });

  it("edits when the expected version matches", async () => {
    const current = await repository.read(NotePath.of(PATH));

    const edited = await editNote.execute({
      path: PATH,
      passage: "buy milk",
      replacement: "buy bread",
      expectedVersion: current.version.value,
    });

    expect(edited.content).toBe(EDITED);
  });

  it("refuses to edit with a stale version", async () => {
    const edit = editNote.execute({
      path: PATH,
      passage: "buy milk",
      replacement: "buy bread",
      expectedVersion: "stale",
    });

    await expect(edit).rejects.toThrow(VersionConflict);
  });

  it("rejects a passage that is missing", async () => {
    const edit = editNote.execute({ path: PATH, passage: "walk dog", replacement: "x" });

    await expect(edit).rejects.toThrow(PassageNotFound);
  });

  it("rejects a passage that appears more than once", async () => {
    const edit = editNote.execute({ path: PATH, passage: "- ", replacement: "* " });

    await expect(edit).rejects.toThrow(PassageNotUnique);
  });

  it("leaves the note untouched when the passage is ambiguous", async () => {
    await editNote.execute({ path: PATH, passage: "- ", replacement: "* " }).catch(() => undefined);

    const note = await repository.read(NotePath.of(PATH));

    expect(note.content).toBe(CONTENT);
  });

  it("rejects a missing note", async () => {
    const edit = editNote.execute({ path: "missing.md", passage: "a", replacement: "b" });

    await expect(edit).rejects.toThrow(NoteNotFound);
  });
});
