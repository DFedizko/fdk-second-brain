import type { NoteStamp } from "./note-catalog";

export interface NoteSnapshot {
    readonly commit?: string;
    readonly stamps: NoteStamp[];
}

export interface NoteTree {
    snapshot(after?: string): Promise<NoteSnapshot>;
}
