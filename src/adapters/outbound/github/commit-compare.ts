import { NotesUnavailable } from "../../../domain/errors/notes-unavailable";
import type { FailureContext } from "./github-error-translator";
import type { GitHubAccess } from "./github-gateway";

const AHEAD = "ahead";
const DIVERGED = "diverged";
const MISSING = "missing";
const NOT_FOUND = 404;
const RANGE = "...";
const ONE_COMMIT = 1;
const BRANCH_LEVEL: FailureContext = {};

export interface CommitHistory {
  includes(head: string, commit: string): Promise<boolean>;
  descendsFrom(head: string, commit: string): Promise<boolean>;
}

export class CommitCompare implements CommitHistory {
  constructor(private readonly github: GitHubAccess) {}

  async includes(head: string, commit: string): Promise<boolean> {
    if (head === commit) return true;
    const status = await this.statusOf(commit, head);
    return status === AHEAD || status === DIVERGED;
  }

  async descendsFrom(head: string, commit: string): Promise<boolean> {
    if (head === commit) return true;
    return (await this.statusOf(commit, head)) === AHEAD;
  }

  private async statusOf(base: string, head: string): Promise<string> {
    const basehead = base + RANGE + head;
    return this.github
      .send(BRANCH_LEVEL, (client, repo) =>
        client.rest.repos.compareCommitsWithBasehead({ ...repo, basehead, per_page: ONE_COMMIT }),
      )
      .then(
        ({ data }) => data.status,
        (error: unknown) => this.treatUnknownAsMissing(error),
      );
  }

  private treatUnknownAsMissing(error: unknown): string {
    if (error instanceof NotesUnavailable && error.status === NOT_FOUND) return MISSING;
    throw error;
  }
}
