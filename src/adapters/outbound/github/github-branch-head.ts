import type { BranchHead } from "../../../application/ports/branch-head";
import { NotesUnavailable } from "../../../domain/errors/notes-unavailable";
import type { FailureContext } from "./github-error-translator";
import type { GitHubAccess } from "./github-gateway";

const BEHIND = "behind";
const NOT_FOUND = 404;
const RANGE = "...";
const ONE_COMMIT = 1;
const BRANCH_LEVEL: FailureContext = {};

// "diverged" counts as reached: the branch moved past the commit (a force push).
export class GitHubBranchHead implements BranchHead {
  constructor(private readonly github: GitHubAccess) {}

  async hasReached(commit: string): Promise<boolean> {
    return this.compareWithBranch(commit).then(
      (status) => status !== BEHIND,
      (error: unknown) => this.treatUnknownAsUnreached(error),
    );
  }

  private async compareWithBranch(commit: string): Promise<string> {
    const basehead = commit + RANGE + this.github.branch;
    const { data } = await this.github.send(BRANCH_LEVEL, (client, repo) =>
      client.rest.repos.compareCommitsWithBasehead({ ...repo, basehead, per_page: ONE_COMMIT }),
    );
    return data.status;
  }

  private treatUnknownAsUnreached(error: unknown): boolean {
    if (error instanceof NotesUnavailable && error.status === NOT_FOUND) return false;
    throw error;
  }
}
