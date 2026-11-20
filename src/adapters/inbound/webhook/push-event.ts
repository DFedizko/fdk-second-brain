import { z } from "zod";

export const MAX_PUSH_COMMITS = 2048;
export const MAX_COMMIT_FILES = 3000;
const BRANCH_REF_PREFIX = "refs/heads/";

const FILES = z.array(z.string()).optional().default([]);

const COMMIT = z.object({ added: FILES, modified: FILES, removed: FILES });

export const PUSH_SCHEMA = z.object({
  ref: z.string(),
  after: z.string(),
  deleted: z.boolean(),
  forced: z.boolean(),
  commits: z.array(COMMIT),
});

type PushBody = z.infer<typeof PUSH_SCHEMA>;
type PushCommit = z.infer<typeof COMMIT>;

export class PushEvent {
  constructor(private readonly body: PushBody) {}

  isTo(branch: string): boolean {
    return this.body.ref === BRANCH_REF_PREFIX + branch;
  }

  get headCommit(): string {
    return this.body.after;
  }

  get deletesBranch(): boolean {
    return this.body.deleted;
  }

  get listsEveryChange(): boolean {
    return !this.body.forced && !this.isCutShort();
  }

  changedPaths(): string[] {
    return this.body.commits.flatMap((commit) => this.filesOf(commit));
  }

  private isCutShort(): boolean {
    if (this.body.commits.length >= MAX_PUSH_COMMITS) return true;
    return this.body.commits.some((commit) => this.filesOf(commit).length >= MAX_COMMIT_FILES);
  }

  private filesOf(commit: PushCommit): string[] {
    return [...commit.added, ...commit.modified, ...commit.removed];
  }
}
