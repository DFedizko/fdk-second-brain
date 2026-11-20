import type { NoteLookup } from "../../../../src/application/ports/note-lookup";
import { UnreadableNote } from "../../../../src/domain/errors/unreadable-note";
import type { Note } from "../../../../src/domain/note";
import type { NotePath } from "../../../../src/domain/note-path";

export class UnreadableNoteLookup implements NoteLookup {
  constructor(private readonly beforeRead: () => Promise<void> = async () => undefined) {}

  async read(path: NotePath): Promise<Note> {
    await this.beforeRead();
    throw new UnreadableNote(path.value);
  }
}
