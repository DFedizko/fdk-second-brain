import type { Octokit } from "@octokit/rest";
import type { NoteRepository } from "../../../application/ports/note-repository";
import { InvalidPath } from "../../../domain/errors/invalid-path";
import { NoteAlreadyExists } from "../../../domain/errors/note-already-exists";
import { NoteNotFound } from "../../../domain/errors/note-not-found";
import { NotesUnavailable } from "../../../domain/errors/notes-unavailable";
import { VersionConflict } from "../../../domain/errors/version-conflict";
import { Note } from "../../../domain/note";
import type { NoteFolder } from "../../../domain/note-folder";
import { NotePath } from "../../../domain/note-path";
import { NoteVersion } from "../../../domain/note-version";
import { decodeBase64, encodeBase64 } from "./base64-text";
import { BranchMoved } from "./branch-moved";
import type { GitHubConfig } from "./github-config";
import type { FailureContext, GitHubErrorMapper } from "./github-error-translator";

const BLOB = "blob";
const FILE = "file";
const BASE64 = "base64";
const FILE_MODE = "100644";
const RECURSIVE = "1";
const NOTE_EXTENSION = ".md";
const BRANCH_REF = "heads/";
const CREATE = "Create";
const UPDATE = "Update";
const DELETE = "Delete";
const MOVE = "Move";
const MOVE_TO = "to";
const MOVE_ATTEMPTS = 2;
const UNPROCESSABLE = 422;
const BRANCH_LEVEL: FailureContext = {};

export class GitHubNoteRepo implements NoteRepository {
  constructor(
    private readonly client: Octokit,
    private readonly config: GitHubConfig,
    private readonly errors: GitHubErrorMapper,
  ) {}

  async list(folder: NoteFolder): Promise<NotePath[]> {
    const { data } = await this.call(BRANCH_LEVEL, () =>
      this.client.rest.git.getTree({
        ...this.repo(),
        tree_sha: this.config.branch,
        recursive: RECURSIVE,
      }),
    );
    if (data.truncated) throw new NotesUnavailable();
    return data.tree
      .filter((entry) => entry.type === BLOB && entry.path.endsWith(NOTE_EXTENSION))
      .map((entry) => entry.path)
      .sort()
      .flatMap((raw) => this.toNotePath(raw))
      .filter((path) => folder.contains(path));
  }

  async read(path: NotePath): Promise<Note> {
    return this.fetchNote(path, this.config.branch).catch((error: unknown) =>
      this.confirmBranchThenThrow(error),
    );
  }

  async create(path: NotePath, content: string): Promise<Note> {
    return this.putFile(path, content, `${CREATE} ${path.value}`);
  }

  async write(path: NotePath, content: string, expected: NoteVersion): Promise<Note> {
    const current = await this.read(path);
    current.ensureVersion(expected);
    return this.putFile(path, content, `${UPDATE} ${path.value}`, expected).catch(
      (error: unknown) => this.reportActualVersion(error, path, expected),
    );
  }

  async delete(path: NotePath): Promise<void> {
    const current = await this.read(path);
    const sha = current.version.value;
    const context = { path: path.value, expected: sha, mayBeMissing: true };
    await this.call(context, () =>
      this.client.rest.repos.deleteFile({
        ...this.repo(),
        path: path.value,
        message: `${DELETE} ${path.value}`,
        sha,
        branch: this.config.branch,
      }),
    ).catch((error: unknown) => this.reportActualVersion(error, path, current.version));
  }

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
    const head = await this.headCommit();
    const note = await this.fetchNote(from, head);
    await this.rejectExistingAt(to, head);
    const tree = await this.movedTree(from, to, note.version, head);
    const message = `${MOVE} ${from.value} ${MOVE_TO} ${to.value}`;
    const commit = await this.commitTree(tree, head, message);
    await this.updateBranch(commit);
    return new Note(to, note.content, note.version);
  }

  private async updateBranch(commit: string): Promise<void> {
    await this.call(BRANCH_LEVEL, () =>
      this.client.rest.git.updateRef({
        ...this.repo(),
        ref: this.branchRef(),
        sha: commit,
        force: false,
      }),
    ).catch((error: unknown) => {
      throw this.isRejectedUpdate(error) ? new BranchMoved() : error;
    });
  }

  private isRejectedUpdate(error: unknown): boolean {
    return error instanceof NotesUnavailable && error.status === UNPROCESSABLE;
  }

  private async fetchNote(path: NotePath, ref: string): Promise<Note> {
    const context = { path: path.value, mayBeMissing: true };
    const { data } = await this.call(context, () =>
      this.client.rest.repos.getContent({ ...this.repo(), path: path.value, ref }),
    );
    if (Array.isArray(data) || data.type !== FILE || !("content" in data)) {
      throw new NoteNotFound(path.value);
    }
    if (data.encoding !== BASE64) throw new NotesUnavailable();
    return new Note(path, decodeBase64(data.content), NoteVersion.of(data.sha));
  }

  private async confirmBranchThenThrow(error: unknown): Promise<never> {
    if (error instanceof NoteNotFound) await this.headCommit();
    throw error;
  }

  private async reportActualVersion(
    error: unknown,
    path: NotePath,
    expected: NoteVersion,
  ): Promise<never> {
    if (!(error instanceof VersionConflict)) throw error;
    const current = await this.read(path);
    throw new VersionConflict(path.value, expected.value, current.version.value);
  }

  private async rejectExistingAt(path: NotePath, ref: string): Promise<void> {
    const exists = await this.fetchNote(path, ref).then(
      () => true,
      (error: unknown) => this.treatMissingAsAbsent(error),
    );
    if (exists) throw new NoteAlreadyExists(path.value);
  }

  private treatMissingAsAbsent(error: unknown): boolean {
    if (error instanceof NoteNotFound) return false;
    throw error;
  }

  private async putFile(path: NotePath, content: string, message: string, expected?: NoteVersion) {
    const context = { path: path.value, expected: expected?.value };
    const { data } = await this.call(context, () =>
      this.client.rest.repos.createOrUpdateFileContents({
        ...this.repo(),
        path: path.value,
        message,
        content: encodeBase64(content),
        sha: expected?.value,
        branch: this.config.branch,
      }),
    );
    return new Note(path, content, NoteVersion.of(data.content?.sha ?? ""));
  }

  private async headCommit(): Promise<string> {
    const { data } = await this.call(BRANCH_LEVEL, () =>
      this.client.rest.git.getRef({ ...this.repo(), ref: this.branchRef() }),
    );
    return data.object.sha;
  }

  private async movedTree(from: NotePath, to: NotePath, blob: NoteVersion, head: string) {
    const { data: commit } = await this.call(BRANCH_LEVEL, () =>
      this.client.rest.git.getCommit({ ...this.repo(), commit_sha: head }),
    );
    const { data } = await this.call(BRANCH_LEVEL, () =>
      this.client.rest.git.createTree({
        ...this.repo(),
        base_tree: commit.tree.sha,
        tree: [
          { path: to.value, mode: FILE_MODE, type: BLOB, sha: blob.value },
          { path: from.value, mode: FILE_MODE, type: BLOB, sha: null },
        ],
      }),
    );
    return data.sha;
  }

  private async commitTree(tree: string, parent: string, message: string): Promise<string> {
    const { data } = await this.call(BRANCH_LEVEL, () =>
      this.client.rest.git.createCommit({ ...this.repo(), message, tree, parents: [parent] }),
    );
    return data.sha;
  }

  private toNotePath(raw: string): NotePath[] {
    try {
      return [NotePath.of(raw)];
    } catch (error) {
      if (error instanceof InvalidPath) return [];
      throw error;
    }
  }

  private async call<T>(context: FailureContext, request: () => Promise<T>): Promise<T> {
    return request().catch((error: unknown) => {
      throw this.errors.toDomainError(error, context);
    });
  }

  private branchRef(): string {
    return BRANCH_REF + this.config.branch;
  }

  private repo() {
    return { owner: this.config.owner, repo: this.config.repo };
  }
}
