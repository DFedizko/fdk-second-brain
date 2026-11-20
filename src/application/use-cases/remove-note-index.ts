import type { IndexNoteInput, IndexNoteResult, NoteIndexer } from "./index-note";

export type RemoveNoteIndexInput = IndexNoteInput;

export class RemoveNoteIndex {
    constructor(private readonly indexer: NoteIndexer) {}

    async execute(input: RemoveNoteIndexInput): Promise<IndexNoteResult> {
        return this.indexer.execute(input);
    }
}
