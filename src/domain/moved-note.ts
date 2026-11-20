import type { NotePath } from "./note-path";
import type { NoteVersion } from "./note-version";

// The content is left out when the note is not valid UTF-8 text, so a reply never
// carries garbled text alongside a version that would let it overwrite the note.
export class MovedNote {
  constructor(
    readonly path: NotePath,
    readonly version: NoteVersion,
    readonly content?: string,
  ) {}
}
