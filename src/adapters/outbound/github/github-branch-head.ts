import type { BranchHead } from "../../../application/ports/branch-head";
import type { NoteLookup } from "../../../application/ports/note-lookup";
import type { HeadNotesFactory } from "./head-notes-factory";
import { EmptyRepository } from "./empty-repository";
import { NoNotes } from "./no-notes";

const NO_NOTES = new NoNotes();

export class GitHubBranchHead implements BranchHead {
    constructor(private readonly notes: HeadNotesFactory) {}

    async readerAt(commit: string): Promise<NoteLookup | null> {
        const notes = this.notes.create();
        return (await notes.pinTo(commit)) ? notes : null;
    }

    async readerAtHead(): Promise<NoteLookup> {
        const notes = this.notes.create();
        return notes.pinToHead().then(
            () => notes,
            (error: unknown) => this.treatEmptyAsNoNotes(error),
        );
    }

    private treatEmptyAsNoNotes(error: unknown): NoteLookup {
        if (error instanceof EmptyRepository) return NO_NOTES;
        throw error;
    }
}
