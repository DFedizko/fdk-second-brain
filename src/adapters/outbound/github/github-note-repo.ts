import type { NoteRepository } from "../../../application/ports/note-repository";
import { ConcurrentChange } from "../../../domain/errors/concurrent-change";
import { InvalidPath } from "../../../domain/errors/invalid-path";
import { NoteNotFound } from "../../../domain/errors/note-not-found";
import { NotesUnavailable } from "../../../domain/errors/notes-unavailable";
import { VersionConflict } from "../../../domain/errors/version-conflict";
import { Note } from "../../../domain/note";
import type { NoteFolder } from "../../../domain/note-folder";
import { NotePath } from "../../../domain/note-path";
import { NoteVersion } from "../../../domain/note-version";
import { encodeBase64 } from "./base64-text";
import { EmptyRepository } from "./empty-repository";
import type { FailureContext } from "./github-error-translator";
import type { GitHubAccess } from "./github-gateway";
import type { NoteMover } from "./github-note-mover";
import type { NoteReader } from "./github-note-reader";

const BLOB = "blob";
const RECURSIVE = "1";
const NOTE_EXTENSION = ".md";
const CREATE = "Create";
const UPDATE = "Update";
const DELETE = "Delete";
const CONFLICT = 409;
const NOT_FOUND = 404;
const REFS_PREFIX = "refs/";
const FILE_WRITE_ATTEMPTS = 3;
const BRANCH_LEVEL: FailureContext = {};

type BranchMoveCheck = (error: unknown) => Promise<boolean>;

export class GitHubNoteRepo implements NoteRepository {
  constructor(
    private readonly github: GitHubAccess,
    private readonly reader: NoteReader,
    private readonly mover: NoteMover,
  ) {}

  async list(folder: NoteFolder): Promise<NotePath[]> {
    const entries = await this.treeEntries().catch((error: unknown) => {
      if (error instanceof EmptyRepository) return [];
      throw error;
    });
    return entries
      .filter((entry) => entry.type === BLOB && entry.path.endsWith(NOTE_EXTENSION))
      .map((entry) => entry.path)
      .sort()
      .flatMap((raw) => this.toNotePath(raw))
      .filter((path) => folder.contains(path));
  }

  private async treeEntries() {
    const { data } = await this.github.send(BRANCH_LEVEL, (client, repo) =>
      client.rest.git.getTree({ ...repo, tree_sha: this.github.branch, recursive: RECURSIVE }),
    );
    if (data.truncated) throw new NotesUnavailable();
    return data.tree;
  }

  async read(path: NotePath): Promise<Note> {
    return this.reader
      .read(path, this.github.branch)
      .catch((error: unknown) => this.confirmBranchThenThrow(error));
  }

  async create(path: NotePath, content: string): Promise<Note> {
    return this.retryFileWrite(
      path,
      () => this.putFile(path, content, `${CREATE} ${path.value}`),
      async (error) => this.isBranchConflict(error),
    ).catch((error: unknown) => this.createFirstNote(error, path, content));
  }

  private async createFirstNote(error: unknown, path: NotePath, content: string): Promise<Note> {
    const missing = error instanceof NotesUnavailable && error.status === NOT_FOUND;
    if (!missing || !(await this.isEmptyRepository())) throw error;
    const { data } = await this.sendPut(path, content, `${CREATE} ${path.value}`);
    await this.pointBranchAt(data.commit.sha ?? "");
    return new Note(path, content, NoteVersion.of(data.content?.sha ?? ""));
  }

  private async isEmptyRepository(): Promise<boolean> {
    return this.reader.headCommit().then(
      () => false,
      (error: unknown) => error instanceof EmptyRepository,
    );
  }

  private async pointBranchAt(commit: string): Promise<void> {
    const exists = await this.reader.headCommit().then(
      () => true,
      (error: unknown) => this.treatMissingBranchAsAbsent(error),
    );
    if (exists) return;
    await this.github.send(BRANCH_LEVEL, (client, repo) =>
      client.rest.git.createRef({ ...repo, ref: REFS_PREFIX + this.github.branchRef, sha: commit }),
    );
  }

  private treatMissingBranchAsAbsent(error: unknown): boolean {
    if (error instanceof NotesUnavailable && error.status === NOT_FOUND) return false;
    throw error;
  }

  async write(path: NotePath, content: string, expected: NoteVersion): Promise<Note> {
    const current = await this.read(path);
    current.ensureVersion(expected);
    return this.retryFileWrite(
      path,
      () => this.putFile(path, content, `${UPDATE} ${path.value}`, expected),
      (error) => this.isStillCurrent(error, path, expected),
    );
  }

  async delete(path: NotePath): Promise<void> {
    const version = await this.currentVersion(path);
    await this.retryFileWrite(
      path,
      () => this.deleteFile(path, version),
      (error) => this.isStillCurrent(error, path, version),
    );
  }

  private async currentVersion(path: NotePath): Promise<NoteVersion> {
    return this.reader
      .versionOf(path, this.github.branch)
      .catch((error: unknown) => this.confirmBranchThenThrow(error));
  }

  async move(from: NotePath, to: NotePath): Promise<Note> {
    return this.mover.move(from, to);
  }

  private async retryFileWrite<T>(
    path: NotePath,
    attempt: () => Promise<T>,
    branchMoved: BranchMoveCheck,
    attemptsLeft = FILE_WRITE_ATTEMPTS,
  ): Promise<T> {
    return attempt().catch(async (error: unknown) => {
      if (!(await branchMoved(error))) throw error;
      if (attemptsLeft <= 1) throw new ConcurrentChange(path.value);
      return this.retryFileWrite(path, attempt, branchMoved, attemptsLeft - 1);
    });
  }

  private isBranchConflict(error: unknown): boolean {
    return error instanceof NotesUnavailable && error.status === CONFLICT;
  }

  private async isStillCurrent(
    error: unknown,
    path: NotePath,
    expected: NoteVersion,
  ): Promise<boolean> {
    if (!(error instanceof VersionConflict)) return false;
    const current = await this.currentVersion(path);
    if (current.equals(expected)) return true;
    throw new VersionConflict(path.value, expected.value, current.value);
  }

  private async confirmBranchThenThrow(error: unknown): Promise<never> {
    if (!(error instanceof NoteNotFound)) throw error;
    await this.reader.headCommit().catch((failure: unknown) => {
      if (!(failure instanceof EmptyRepository)) throw failure;
    });
    throw error;
  }

  private async putFile(path: NotePath, content: string, message: string, expected?: NoteVersion) {
    const { data } = await this.sendPut(path, content, message, expected, this.github.branch);
    return new Note(path, content, NoteVersion.of(data.content?.sha ?? ""));
  }

  private async sendPut(
    path: NotePath,
    content: string,
    message: string,
    expected?: NoteVersion,
    branch?: string,
  ) {
    const context = { path: path.value, expected: expected?.value };
    return this.github.send(context, (client, repo) =>
      client.rest.repos.createOrUpdateFileContents({
        ...repo,
        path: path.value,
        message,
        content: encodeBase64(content),
        sha: expected?.value,
        branch,
      }),
    );
  }

  private async deleteFile(path: NotePath, version: NoteVersion): Promise<void> {
    const sha = version.value;
    const context = { path: path.value, expected: sha, mayBeMissing: true };
    await this.github.send(context, (client, repo) =>
      client.rest.repos.deleteFile({
        ...repo,
        path: path.value,
        message: `${DELETE} ${path.value}`,
        sha,
        branch: this.github.branch,
      }),
    );
  }

  private toNotePath(raw: string): NotePath[] {
    try {
      return [NotePath.of(raw)];
    } catch (error) {
      if (error instanceof InvalidPath) return [];
      throw error;
    }
  }
}
