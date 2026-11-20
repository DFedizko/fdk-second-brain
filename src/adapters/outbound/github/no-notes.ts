import type { NoteLookup } from "../../../application/ports/note-lookup";
import { NoteNotFound } from "../../../domain/errors/note-not-found";
import type { Note } from "../../../domain/note";
import type { NotePath } from "../../../domain/note-path";

export class NoNotes implements NoteLookup {
    async read(path: NotePath): Promise<Note> {
        throw new NoteNotFound(path.value);
    }
}
