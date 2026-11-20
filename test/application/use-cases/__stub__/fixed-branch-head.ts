import type { BranchHead } from "../../../../src/application/ports/branch-head";
import type { NoteLookup } from "../../../../src/application/ports/note-lookup";
import { InMemoryNoteRepo } from "../../__fake__/in-memory-note-repo";

export class FixedBranchHead implements BranchHead {
    readonly asked: string[] = [];
    readonly atHead: NoteLookup = new InMemoryNoteRepo();

    constructor(private readonly pinned: NoteLookup | null) {}

    async readerAt(commit: string): Promise<NoteLookup | null> {
        this.asked.push(commit);
        return this.pinned;
    }

    async readerAtHead(): Promise<NoteLookup> {
        return this.atHead;
    }
}
