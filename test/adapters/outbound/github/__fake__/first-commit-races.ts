import type { FakeGitStore } from "./fake-git-store";
import { STATUS } from "./github-replies";

const PUT = "PUT";

export type FakeFiles = Readonly<Record<string, string>>;
type SeedFiles = (files: FakeFiles) => void;

export class FirstCommitRaces {
  private afterBranchMiss?: FakeFiles;
  private beforeFirstCommit?: FakeFiles;

  constructor(
    private readonly store: FakeGitStore,
    private readonly seed: SeedFiles,
  ) {}

  landAfterBranchMiss(files: FakeFiles): void {
    this.afterBranchMiss = files;
  }

  landBeforeFirstCommit(files: FakeFiles): void {
    this.beforeFirstCommit = files;
  }

  beforeRequest(method: string, body: Record<string, unknown>): void {
    const files = this.beforeFirstCommit;
    if (!files || method !== PUT || body.branch !== undefined || this.store.hasRefs()) return;
    this.beforeFirstCommit = undefined;
    this.seed(files);
  }

  afterReply(method: string, status: number): void {
    const files = this.afterBranchMiss;
    if (!files || method !== PUT || status !== STATUS.notFound) return;
    this.afterBranchMiss = undefined;
    this.seed(files);
  }
}
