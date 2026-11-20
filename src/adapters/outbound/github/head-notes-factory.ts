import type { NoteLookup } from "../../../application/ports/note-lookup";

export interface PinnableNotes extends NoteLookup {
    pinTo(commit: string): Promise<boolean>;
    pinToHead(): Promise<void>;
}

export interface HeadNotesFactory {
    create(): PinnableNotes;
}
