import {
  DeletedNotePaths,
  MovedNotePaths,
  SavedNotePaths,
} from "../../../src/application/use-cases/changed-paths";
import type { NoteView } from "../../../src/application/use-cases/note-view";

const FROM = "projects/plan.md";
const TO = "archive/plan.md";
const VIEW: NoteView = { path: TO, content: "# Plan\n", version: "abc123" };

describe("SavedNotePaths", () => {
  it("indexes the saved note", () => {
    const change = new SavedNotePaths().of({}, VIEW);

    expect(change).toEqual({ indexed: [TO], removed: [] });
  });
});

describe("MovedNotePaths", () => {
  it("indexes the new path and removes the old one", () => {
    const change = new MovedNotePaths().of({ from: FROM, to: TO }, VIEW);

    expect(change).toEqual({ indexed: [TO], removed: [FROM] });
  });
});

describe("DeletedNotePaths", () => {
  it("removes the deleted note", () => {
    const change = new DeletedNotePaths().of({ path: FROM });

    expect(change).toEqual({ indexed: [], removed: [FROM] });
  });
});
