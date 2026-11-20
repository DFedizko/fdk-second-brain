import type { IndexNoteInput, IndexNoteResult, NoteIndexer } from "./index-note";

export type RemoveNoteIndexInput = IndexNoteInput;

// A removal can arrive after the note was created again, so it syncs the path
// with the repository instead of deleting blindly.
export class RemoveNoteIndex {
  constructor(private readonly indexer: NoteIndexer) {}

  async execute(input: RemoveNoteIndexInput): Promise<IndexNoteResult> {
    return this.indexer.execute(input);
  }
}
