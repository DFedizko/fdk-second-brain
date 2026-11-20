import { NoteNotFound } from "../../../domain/errors/note-not-found";
import { NotesUnavailable } from "../../../domain/errors/notes-unavailable";
import { Note } from "../../../domain/note";
import type { NotePath } from "../../../domain/note-path";
import { NoteVersion } from "../../../domain/note-version";
import { encodeBase64 } from "./base64-text";
import { BranchMoved } from "./branch-moved";
import { EmptyRepository } from "./empty-repository";
import type { FailureContext } from "./github-error-translator";
import type { GitHubAccess } from "./github-gateway";
import type { NoteReader } from "./github-note-reader";
import { RefAlreadyExists } from "./ref-already-exists";

const CREATE = "Create";
const NOT_FOUND = 404;
const REFS_PREFIX = "refs/";
const BRANCH_LEVEL: FailureContext = {};

export interface FirstNoteWriter {
  create(path: NotePath, content: string): Promise<Note | undefined>;
}

export class GitHubFirstNote implements FirstNoteWriter {
  constructor(
    private readonly github: GitHubAccess,
    private readonly reader: NoteReader,
  ) {}

  async create(path: NotePath, content: string): Promise<Note | undefined> {
    const { data } = await this.putOnDefaultBranch(path, content);
    const note = new Note(path, content, NoteVersion.of(data.content?.sha ?? ""));
    const onBranch = await this.bringBranchTo(data.commit.sha ?? "", note);
    return onBranch ? note : undefined;
  }

  private async bringBranchTo(commit: string, note: Note): Promise<boolean> {
    const created = await this.createBranchAt(commit);
    if (created) return true;
    const forwarded = await this.fastForwardTo(commit);
    return forwarded || this.branchHolds(note);
  }

  private async createBranchAt(commit: string): Promise<boolean> {
    if (await this.branchExists()) return false;
    return this.github
      .send(BRANCH_LEVEL, (client, repo) =>
        client.rest.git.createRef({
          ...repo,
          ref: REFS_PREFIX + this.github.branchRef,
          sha: commit,
        }),
      )
      .then(
        () => true,
        (error: unknown) => this.treatRacedRefAsTaken(error),
      );
  }

  private async fastForwardTo(commit: string): Promise<boolean> {
    return this.github
      .send(BRANCH_LEVEL, (client, repo) =>
        client.rest.git.updateRef({
          ...repo,
          ref: this.github.branchRef,
          sha: commit,
          force: false,
        }),
      )
      .then(
        () => true,
        (error: unknown) => this.treatMovedAsBehind(error),
      );
  }

  private async branchHolds(note: Note): Promise<boolean> {
    return this.reader.versionOf(note.path, this.github.branch).then(
      (version) => version.equals(note.version),
      (error: unknown) => this.treatMissingAsAbsent(error),
    );
  }

  private async branchExists(): Promise<boolean> {
    return this.reader.headCommit().then(
      () => true,
      (error: unknown) => this.treatMissingBranch(error),
    );
  }

  private async treatRacedRefAsTaken(error: unknown): Promise<boolean> {
    if (error instanceof RefAlreadyExists) return false;
    if (await this.branchExists()) return false;
    throw error;
  }

  private treatMovedAsBehind(error: unknown): boolean {
    if (error instanceof BranchMoved) return false;
    throw error;
  }

  private treatMissingAsAbsent(error: unknown): boolean {
    if (error instanceof NoteNotFound) return false;
    throw error;
  }

  private treatMissingBranch(error: unknown): boolean {
    if (error instanceof EmptyRepository) return false;
    if (error instanceof NotesUnavailable && error.status === NOT_FOUND) return false;
    throw error;
  }

  private async putOnDefaultBranch(path: NotePath, content: string) {
    return this.github.send({ path: path.value }, (client, repo) =>
      client.rest.repos.createOrUpdateFileContents({
        ...repo,
        path: path.value,
        message: `${CREATE} ${path.value}`,
        content: encodeBase64(content),
      }),
    );
  }
}
