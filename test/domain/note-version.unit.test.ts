import { NoteVersion } from "../../src/domain/note-version";

const HASH = "3b18e512dba79e4c8300dd08aeb37f8e728b8dad";
const OTHER_HASH = "8ab686eafeb1f44702738c8b0f24f2567c36da6d";

describe("NoteVersion", () => {
  it("keeps the content hash", () => {
    const version = NoteVersion.of(HASH);

    expect(version.value).toBe(HASH);
  });

  it("equals a version with the same hash", () => {
    const version = NoteVersion.of(HASH);

    expect(version.equals(NoteVersion.of(HASH))).toBe(true);
  });

  it("differs from a version with another hash", () => {
    const version = NoteVersion.of(HASH);

    expect(version.equals(NoteVersion.of(OTHER_HASH))).toBe(false);
  });
});
