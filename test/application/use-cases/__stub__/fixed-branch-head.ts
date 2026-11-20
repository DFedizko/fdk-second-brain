import type { BranchHead } from "../../../../src/application/ports/branch-head";

export class FixedBranchHead implements BranchHead {
  readonly asked: string[] = [];

  constructor(private readonly reached: boolean) {}

  async hasReached(commit: string): Promise<boolean> {
    this.asked.push(commit);
    return this.reached;
  }
}
