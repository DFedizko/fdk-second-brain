import type { BranchHead } from "../../../../src/application/ports/branch-head";
import type { NoteLookup } from "../../../../src/application/ports/note-lookup";

export class FixedBranchHead implements BranchHead {
  readonly asked: string[] = [];

  constructor(private readonly pinned: NoteLookup | null) {}

  async readerAt(commit: string): Promise<NoteLookup | null> {
    this.asked.push(commit);
    return this.pinned;
  }
}
