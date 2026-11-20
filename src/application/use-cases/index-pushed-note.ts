import { BranchBehind } from "../../domain/errors/branch-behind";
import type { BranchHead } from "../ports/branch-head";
import type { NoteLookup } from "../ports/note-lookup";
import type { IndexNoteResult, NoteIndexer } from "./index-note";

export interface PushedNoteInput {
  readonly path: string;
  readonly commit?: string;
}

export interface PushedNoteIndexer {
  execute(input: PushedNoteInput): Promise<IndexNoteResult>;
}

export interface IndexerFactory {
  over(notes: NoteLookup): NoteIndexer;
}

export class IndexPushedNote implements PushedNoteIndexer {
  constructor(
    private readonly head: BranchHead,
    private readonly indexers: IndexerFactory,
  ) {}

  async execute(input: PushedNoteInput): Promise<IndexNoteResult> {
    const pinned = await this.pinnedNotes(input.commit);
    return this.indexers.over(pinned).execute({ path: input.path });
  }

  private async pinnedNotes(commit?: string): Promise<NoteLookup> {
    if (commit === undefined) return this.head.readerAtHead();
    const pinned = await this.head.readerAt(commit);
    if (pinned === null) throw new BranchBehind(commit);
    return pinned;
  }
}
