import type { MovedNote } from "../../domain/moved-note";
import type { Note } from "../../domain/note";

export interface NoteView {
  readonly path: string;
  readonly content: string;
  readonly version: string;
}

export interface MovedNoteView {
  readonly path: string;
  readonly version: string;
  readonly content?: string;
}

export function toNoteView(note: Note): NoteView {
  return { path: note.path.value, content: note.content, version: note.version.value };
}

export function toMovedView(note: MovedNote): MovedNoteView {
  return { path: note.path.value, content: note.content, version: note.version.value };
}
