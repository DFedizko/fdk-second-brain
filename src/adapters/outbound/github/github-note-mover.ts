import { ConcurrentChange } from "../../../domain/errors/concurrent-change";
import { NoteAlreadyExists } from "../../../domain/errors/note-already-exists";
import { NoteNotFound } from "../../../domain/errors/note-not-found";
import { NotesUnavailable } from "../../../domain/errors/notes-unavailable";
import { UnreadableNote } from "../../../domain/errors/unreadable-note";
import { MovedNote } from "../../../domain/moved-note";
import type { NotePath } from "../../../domain/note-path";
import type { NoteVersion } from "../../../domain/note-version";
import { BranchMoved } from "./branch-moved";
import { EmptyRepository } from "./empty-repository";
import type { FailureContext } from "./github-error-translator";
import type { GitHubAccess } from "./github-gateway";
import type { NoteReader } from "./github-note-reader";

const BLOB = "blob";
const FILE_MODE = "100644";
const EXECUTABLE_MODE = "100755";
const SEPARATOR = "/";
const MOVE = "Move";
const MOVE_TO = "to";
const MOVE_ATTEMPTS = 2;
const BRANCH_LEVEL: FailureContext = {};

type GitFileMode = typeof FILE_MODE | typeof EXECUTABLE_MODE;

interface MoveSource {
  readonly version: NoteVersion;
  readonly content?: string;
}

export interface NoteMover {
  move(from: NotePath, to: NotePath): Promise<MovedNote>;
}

export class GitHubNoteMover implements NoteMover {
  constructor(
    private readonly github: GitHubAccess,
    private readonly reader: NoteReader,
  ) {}

  async move(from: NotePath, to: NotePath): Promise<MovedNote> {
    return this.moveWithRetry(from, to, MOVE_ATTEMPTS);
  }

  private async moveWithRetry(from: NotePath, to: NotePath, attempts: number): Promise<MovedNote> {
    return this.moveOnce(from, to).catch((error: unknown) => {
      if (!(error instanceof BranchMoved)) throw error;
      if (attempts <= 1) throw new ConcurrentChange(from.value);
      return this.moveWithRetry(from, to, attempts - 1);
    });
  }

  private async moveOnce(from: NotePath, to: NotePath): Promise<MovedNote> {
    const head = await this.reader.headCommit().catch((error: unknown) => {
      throw error instanceof EmptyRepository ? new NoteNotFound(from.value) : error;
    });
    const source = await this.sourceOf(from, head);
    if (await this.reader.exists(to, head)) throw new NoteAlreadyExists(to.value);
    const tree = await this.movedTree(from, to, source.version, head);
    const message = `${MOVE} ${from.value} ${MOVE_TO} ${to.value}`;
    const commit = await this.commitTree(tree, head, message);
    await this.updateBranch(commit);
    return new MovedNote(to, source.version, source.content);
  }

  private async sourceOf(from: NotePath, head: string): Promise<MoveSource> {
    return this.reader.read(from, head).catch(async (error: unknown) => {
      if (!(error instanceof UnreadableNote)) throw error;
      return { version: await this.reader.versionOf(from, head) };
    });
  }

  private async updateBranch(commit: string): Promise<void> {
    await this.github.send(BRANCH_LEVEL, (client, repo) =>
      client.rest.git.updateRef({
        ...repo,
        ref: this.github.branchRef,
        sha: commit,
        force: false,
      }),
    );
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

  private async modeOf(path: NotePath, rootTree: string): Promise<GitFileMode> {
    const segments = path.value.split(SEPARATOR);
    const folders = segments.slice(0, -1);
    const folderTree = await folders.reduce(
      async (tree, folder) => (await this.entryOf(await tree, folder)).sha,
      Promise.resolve(rootTree),
    );
    const entry = await this.entryOf(folderTree, segments.at(-1) ?? path.value);
    return entry.mode === EXECUTABLE_MODE ? EXECUTABLE_MODE : FILE_MODE;
  }

  private async entryOf(tree: string, name: string) {
    const { data } = await this.github.send(BRANCH_LEVEL, (client, repo) =>
      client.rest.git.getTree({ ...repo, tree_sha: tree }),
    );
    const entry = data.tree.find((candidate) => candidate.path === name);
    if (!entry?.sha) throw new NotesUnavailable();
    return { sha: entry.sha, mode: entry.mode };
  }

  private async commitTree(tree: string, parent: string, message: string): Promise<string> {
    const { data } = await this.github.send(BRANCH_LEVEL, (client, repo) =>
      client.rest.git.createCommit({ ...repo, message, tree, parents: [parent] }),
    );
    return data.sha;
  }
}
