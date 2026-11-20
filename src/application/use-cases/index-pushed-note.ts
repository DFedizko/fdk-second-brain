import { BranchBehind } from "../../domain/errors/branch-behind";
import type { BranchHead } from "../ports/branch-head";
import type { IndexNoteResult, NoteIndexer } from "./index-note";

export interface PushedNoteInput {
  readonly path: string;
  readonly commit?: string;
}

export interface PushedNoteIndexer {
  execute(input: PushedNoteInput): Promise<IndexNoteResult>;
}

// Reads by branch name can lag just after a push, so a pushed path waits until
// the branch has reached the push's commit; the note is still read at the head.
export class IndexPushedNote implements PushedNoteIndexer {
  constructor(
    private readonly head: BranchHead,
    private readonly indexer: NoteIndexer,
  ) {}

  async execute(input: PushedNoteInput): Promise<IndexNoteResult> {
    if (input.commit !== undefined) await this.rejectStaleHead(input.commit);
    return this.indexer.execute({ path: input.path });
  }

  private async rejectStaleHead(commit: string): Promise<void> {
    if (!(await this.head.hasReached(commit))) throw new BranchBehind(commit);
  }
}
