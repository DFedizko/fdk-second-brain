import type { NotePath } from "./note-path";
import type { NoteVersion } from "./note-version";

export class MovedNote {
    constructor(
        readonly path: NotePath,
        readonly version: NoteVersion,
        readonly content?: string,
    ) {}
}
