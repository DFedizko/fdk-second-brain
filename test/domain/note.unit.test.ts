import { Note } from "../../src/domain/note";
import { NotePath } from "../../src/domain/note-path";
import { NoteVersion } from "../../src/domain/note-version";
import { VersionConflict } from "../../src/domain/errors/version-conflict";

const PATH = NotePath.of("inbox.md");
const CONTENT = "# Inbox\n";
const CURRENT = NoteVersion.of("current-hash");
const STALE = NoteVersion.of("stale-hash");

describe("Note", () => {
  it("accepts the version it holds", () => {
    const note = new Note(PATH, CONTENT, CURRENT);

    expect(() => note.ensureVersion(CURRENT)).not.toThrow();
  });

  it("rejects a stale expected version", () => {
    const note = new Note(PATH, CONTENT, CURRENT);

    expect(() => note.ensureVersion(STALE)).toThrow(VersionConflict);
  });

  it("names both versions in the conflict", () => {
    const note = new Note(PATH, CONTENT, CURRENT);

    expect(() => note.ensureVersion(STALE)).toThrow(/stale-hash.*current-hash/);
  });
});
