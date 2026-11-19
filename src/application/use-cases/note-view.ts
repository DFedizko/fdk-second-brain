import type { Note } from "../../domain/note";

export interface NoteView {
  readonly path: string;
  readonly content: string;
  readonly version: string;
}

export function toNoteView(note: Note): NoteView {
  return { path: note.path.value, content: note.content, version: note.version.value };
}
