import {
  DeletedNotePaths,
  MovedNotePaths,
  SavedNotePaths,
} from "../../../src/application/use-cases/changed-paths";
import type { MovedNoteView, NoteView } from "../../../src/application/use-cases/note-view";

const FROM = "projects/plan.md";
const TO = "archive/plan.md";
const VERSION = "abc123";
const VIEW: NoteView = { path: TO, content: "# Plan\n", version: VERSION };
const NOT_TEXT: MovedNoteView = { path: TO, version: VERSION };

describe("SavedNotePaths", () => {
  it("indexes the saved note as it was saved", () => {
    const change = new SavedNotePaths().of({}, VIEW);

    expect(change).toEqual({ indexed: [VIEW], removed: [] });
  });
});

describe("MovedNotePaths", () => {
  it("indexes the new path and removes the old one", () => {
    const change = new MovedNotePaths().of({ from: FROM, to: TO }, VIEW);

    expect(change).toEqual({ indexed: [VIEW], removed: [FROM] });
  });

  it("only removes the old path when the moved note is not text", () => {
    const change = new MovedNotePaths().of({ from: FROM, to: TO }, NOT_TEXT);

    expect(change).toEqual({ indexed: [], removed: [FROM] });
  });
});

describe("DeletedNotePaths", () => {
  it("removes the deleted note", () => {
    const change = new DeletedNotePaths().of({ path: FROM });

    expect(change).toEqual({ indexed: [], removed: [FROM] });
  });
});
