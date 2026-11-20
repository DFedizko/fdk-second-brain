import { NotesUnavailable } from "../../../domain/errors/notes-unavailable";
import type { FailureContext } from "./github-error-translator";
import type { GitHubAccess } from "./github-gateway";

const BEHIND = "behind";
const NOT_FOUND = 404;
const RANGE = "...";
const ONE_COMMIT = 1;
const BRANCH_LEVEL: FailureContext = {};

// "diverged" counts as included: the branch moved past the commit (a force push).
// A commit GitHub doesn't know yet counts as not included.
export class CommitCompare {
  constructor(private readonly github: GitHubAccess) {}

  async includes(head: string, commit: string): Promise<boolean> {
    if (head === commit) return true;
    return this.statusOf(commit, head).then(
      (status) => status !== BEHIND,
      (error: unknown) => this.treatUnknownAsMissing(error),
    );
  }

  private async statusOf(base: string, head: string): Promise<string> {
    const basehead = base + RANGE + head;
    const { data } = await this.github.send(BRANCH_LEVEL, (client, repo) =>
      client.rest.repos.compareCommitsWithBasehead({ ...repo, basehead, per_page: ONE_COMMIT }),
    );
    return data.status;
  }

  private treatUnknownAsMissing(error: unknown): boolean {
    if (error instanceof NotesUnavailable && error.status === NOT_FOUND) return false;
    throw error;
  }
}
