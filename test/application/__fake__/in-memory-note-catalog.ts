import type { NoteCatalog, NoteStamp } from "../../../src/application/ports/note-catalog";
import type { NoteRepository } from "../../../src/application/ports/note-repository";
import { NoteFolder } from "../../../src/domain/note-folder";

const ROOT = NoteFolder.of("");

export class InMemoryNoteCatalog implements NoteCatalog {
  constructor(private readonly notes: NoteRepository) {}

  async stamps(): Promise<NoteStamp[]> {
    const paths = await this.notes.list(ROOT);
    const notes = await Promise.all(paths.map((path) => this.notes.read(path)));
    return notes.map((note) => ({ path: note.path, version: note.version }));
  }
}
