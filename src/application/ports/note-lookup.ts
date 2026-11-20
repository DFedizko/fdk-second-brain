import type { Note } from "../../domain/note";
import type { NotePath } from "../../domain/note-path";

export interface NoteLookup {
    read(path: NotePath): Promise<Note>;
}
