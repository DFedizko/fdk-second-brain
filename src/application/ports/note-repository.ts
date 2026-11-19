import type { Note } from "../../domain/note";
import type { NoteFolder } from "../../domain/note-folder";
import type { NotePath } from "../../domain/note-path";
import type { NoteVersion } from "../../domain/note-version";

export interface NoteRepository {
  list(folder: NoteFolder): Promise<NotePath[]>;
  read(path: NotePath): Promise<Note>;
  create(path: NotePath, content: string): Promise<Note>;
  write(path: NotePath, content: string, expected: NoteVersion): Promise<Note>;
  delete(path: NotePath): Promise<void>;
  move(from: NotePath, to: NotePath): Promise<Note>;
}
