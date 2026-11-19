import { NotePath } from "../../src/domain/note-path";
import { InvalidPath } from "../../src/domain/errors/invalid-path";

const VALID_PATH = "projects/second-brain/plan.md";
const ROOT_NOTE = "inbox.md";

describe("NotePath", () => {
  it("keeps a valid nested markdown path", () => {
    const path = NotePath.of(VALID_PATH);

    expect(path.value).toBe(VALID_PATH);
  });

  it("accepts a note at the root", () => {
    const path = NotePath.of(ROOT_NOTE);

    expect(path.value).toBe(ROOT_NOTE);
  });

  it.each([
    ["an empty path", ""],
    ["a file that is not markdown", "notes/plan.txt"],
    ["a path without extension", "notes/plan"],
    ["a parent folder segment", "notes/../secrets.md"],
    ["a leading slash", "/notes/plan.md"],
    ["a dot-folder", ".github/plan.md"],
    ["a nested dot-folder", "notes/.obsidian/plan.md"],
    ["a dot-file", "notes/.plan.md"],
    ["an empty segment", "notes//plan.md"],
    ["a backslash", "notes\\plan.md"],
    ["a bare extension", ".md"],
    ["a control character", "notes/pl\u0000an.md"],
    ["a line break", "notes/pl\nan.md"],
  ])("rejects %s", (_case, raw) => {
    const build = () => NotePath.of(raw);

    expect(build).toThrow(InvalidPath);
  });

  it("names the rejected path in the error", () => {
    const build = () => NotePath.of("/etc/passwd");

    expect(build).toThrow("/etc/passwd");
  });

  it("exposes the folder of a nested note", () => {
    const path = NotePath.of(VALID_PATH);

    expect(path.folder).toBe("projects/second-brain");
  });

  it("has an empty folder at the root", () => {
    const path = NotePath.of(ROOT_NOTE);

    expect(path.folder).toBe("");
  });

  it("equals another path with the same value", () => {
    const path = NotePath.of(VALID_PATH);

    expect(path.equals(NotePath.of(VALID_PATH))).toBe(true);
  });

  it("differs from a path with another value", () => {
    const path = NotePath.of(VALID_PATH);

    expect(path.equals(NotePath.of(ROOT_NOTE))).toBe(false);
  });
});
