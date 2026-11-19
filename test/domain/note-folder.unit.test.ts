import { NoteFolder } from "../../src/domain/note-folder";
import { NotePath } from "../../src/domain/note-path";
import { InvalidPath } from "../../src/domain/errors/invalid-path";

const FOLDER = "projects";
const NESTED_NOTE = "projects/second-brain/plan.md";

describe("NoteFolder", () => {
  it("keeps a valid folder", () => {
    const folder = NoteFolder.of(FOLDER);

    expect(folder.value).toBe(FOLDER);
  });

  it("drops a trailing slash", () => {
    const folder = NoteFolder.of("projects/");

    expect(folder.value).toBe(FOLDER);
  });

  it("treats an empty folder as the root", () => {
    const folder = NoteFolder.of("");

    expect(folder.value).toBe("");
  });

  it.each([
    ["a parent folder segment", "projects/../secrets"],
    ["a leading slash", "/projects"],
    ["a dot-folder", ".github"],
    ["an empty segment", "projects//old"],
    ["a backslash", "projects\\old"],
  ])("rejects %s", (_case, raw) => {
    const build = () => NoteFolder.of(raw);

    expect(build).toThrow(InvalidPath);
  });

  it("contains a note nested below it", () => {
    const folder = NoteFolder.of(FOLDER);

    expect(folder.contains(NotePath.of(NESTED_NOTE))).toBe(true);
  });

  it("does not contain a note in a folder that only shares its prefix", () => {
    const folder = NoteFolder.of(FOLDER);

    expect(folder.contains(NotePath.of("projects-old/plan.md"))).toBe(false);
  });

  it("contains every note when it is the root", () => {
    const folder = NoteFolder.of("");

    expect(folder.contains(NotePath.of("inbox.md"))).toBe(true);
  });
});
