import type { BranchHead } from "../../../application/ports/branch-head";
import type { NoteLookup } from "../../../application/ports/note-lookup";
import type { Note } from "../../../domain/note";
import type { NotePath } from "../../../domain/note-path";
import { NotesUnavailable } from "../../../domain/errors/notes-unavailable";
import type { FailureContext } from "./github-error-translator";
import type { GitHubAccess } from "./github-gateway";
import type { NoteReader } from "./github-note-reader";

const BEHIND = "behind";
const NOT_FOUND = 404;
const RANGE = "...";
const ONE_COMMIT = 1;
const BRANCH_LEVEL: FailureContext = {};

class NotesAtCommit implements NoteLookup {
  constructor(
    private readonly reader: NoteReader,
    private readonly commit: string,
  ) {}

  read(path: NotePath): Promise<Note> {
    return this.reader.read(path, this.commit);
  }
}

// The head is resolved once and every read uses that sha, so the check and the
// reads can't see different branch states. "diverged" means a force push moved on.
export class GitHubBranchHead implements BranchHead {
  constructor(
    private readonly github: GitHubAccess,
    private readonly reader: NoteReader,
  ) {}

  async readerAt(commit: string): Promise<NoteLookup | null> {
    const head = await this.reader.headCommit();
    const reached = head === commit || (await this.includes(head, commit));
    return reached ? new NotesAtCommit(this.reader, head) : null;
  }

  private async includes(head: string, commit: string): Promise<boolean> {
    return this.compare(commit, head).then(
      (status) => status !== BEHIND,
      (error: unknown) => this.treatUnknownAsMissing(error),
    );
  }

  private async compare(base: string, head: string): Promise<string> {
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
