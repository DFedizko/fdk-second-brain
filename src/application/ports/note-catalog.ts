import type { NotePath } from "../../domain/note-path";
import type { NoteVersion } from "../../domain/note-version";

export interface NoteStamp {
  readonly path: NotePath;
  readonly version: NoteVersion;
}

export interface NoteCatalog {
  stamps(): Promise<NoteStamp[]>;
}
