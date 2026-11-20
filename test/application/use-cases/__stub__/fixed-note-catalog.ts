import type { NoteCatalog, NoteStamp } from "../../../../src/application/ports/note-catalog";
import { NotePath } from "../../../../src/domain/note-path";
import { NoteVersion } from "../../../../src/domain/note-version";

export class FixedNoteCatalog implements NoteCatalog {
  constructor(private readonly versions: Readonly<Record<string, string>>) {}

  async stamps(): Promise<NoteStamp[]> {
    return Object.entries(this.versions).map(([path, version]) => ({
      path: NotePath.of(path),
      version: NoteVersion.of(version),
    }));
  }
}
