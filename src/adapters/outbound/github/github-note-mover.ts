import { NoteAlreadyExists } from "../../../domain/errors/note-already-exists";
import { NotesUnavailable } from "../../../domain/errors/notes-unavailable";
import { Note } from "../../../domain/note";
import type { NotePath } from "../../../domain/note-path";
import type { NoteVersion } from "../../../domain/note-version";
import { BranchMoved } from "./branch-moved";
import type { FailureContext } from "./github-error-translator";
import type { GitHubAccess } from "./github-gateway";
import type { NoteReader } from "./github-note-reader";

const BLOB = "blob";
const FILE_MODE = "100644";
const EXECUTABLE_MODE = "100755";
const RECURSIVE = "1";
const MOVE = "Move";
const MOVE_TO = "to";
const MOVE_ATTEMPTS = 2;
const UNPROCESSABLE = 422;
const BRANCH_LEVEL: FailureContext = {};

type GitFileMode = typeof FILE_MODE | typeof EXECUTABLE_MODE;

export interface NoteMover {
  move(from: NotePath, to: NotePath): Promise<Note>;
}

export class GitHubNoteMover implements NoteMover {
  constructor(
    private readonly github: GitHubAccess,
    private readonly reader: NoteReader,
  ) {}

  async move(from: NotePath, to: NotePath): Promise<Note> {
    return this.moveWithRetry(from, to, MOVE_ATTEMPTS);
  }

  private async moveWithRetry(from: NotePath, to: NotePath, attempts: number): Promise<Note> {
    return this.moveOnce(from, to).catch((error: unknown) => {
      if (!(error instanceof BranchMoved)) throw error;
      if (attempts <= 1) throw new NotesUnavailable(UNPROCESSABLE);
      return this.moveWithRetry(from, to, attempts - 1);
    });
  }

  private async moveOnce(from: NotePath, to: NotePath): Promise<Note> {
    const head = await this.reader.headCommit();
    const note = await this.reader.read(from, head);
    if (await this.reader.exists(to, head)) throw new NoteAlreadyExists(to.value);
    const tree = await this.movedTree(from, to, note.version, head);
    const message = `${MOVE} ${from.value} ${MOVE_TO} ${to.value}`;
    const commit = await this.commitTree(tree, head, message);
    await this.updateBranch(commit);
    return new Note(to, note.content, note.version);
  }

  private async updateBranch(commit: string): Promise<void> {
    await this.github
      .send(BRANCH_LEVEL, (client, repo) =>
        client.rest.git.updateRef({
          ...repo,
          ref: this.github.branchRef,
          sha: commit,
          force: false,
        }),
      )
      .catch((error: unknown) => {
        throw this.isRejectedUpdate(error) ? new BranchMoved() : error;
      });
  }

  private isRejectedUpdate(error: unknown): boolean {
    return error instanceof NotesUnavailable && error.status === UNPROCESSABLE;
  }

  private async movedTree(from: NotePath, to: NotePath, blob: NoteVersion, head: string) {
    const { data: commit } = await this.github.send(BRANCH_LEVEL, (client, repo) =>
      client.rest.git.getCommit({ ...repo, commit_sha: head }),
    );
    const mode = await this.modeOf(from, commit.tree.sha);
    const { data } = await this.github.send(BRANCH_LEVEL, (client, repo) =>
      client.rest.git.createTree({
        ...repo,
        base_tree: commit.tree.sha,
        tree: [
          { path: to.value, mode, type: BLOB, sha: blob.value },
          { path: from.value, mode: FILE_MODE, type: BLOB, sha: null },
        ],
      }),
    );
    return data.sha;
  }

  private async modeOf(path: NotePath, tree: string): Promise<GitFileMode> {
    const { data } = await this.github.send(BRANCH_LEVEL, (client, repo) =>
      client.rest.git.getTree({ ...repo, tree_sha: tree, recursive: RECURSIVE }),
    );
    const entry = data.tree.find((candidate) => candidate.path === path.value);
    return entry?.mode === EXECUTABLE_MODE ? EXECUTABLE_MODE : FILE_MODE;
  }

  private async commitTree(tree: string, parent: string, message: string): Promise<string> {
    const { data } = await this.github.send(BRANCH_LEVEL, (client, repo) =>
      client.rest.git.createCommit({ ...repo, message, tree, parents: [parent] }),
    );
    return data.sha;
  }
}
