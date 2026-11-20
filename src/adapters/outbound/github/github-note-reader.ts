import { NoteNotFound } from "../../../domain/errors/note-not-found";
import { UnreadableNote } from "../../../domain/errors/unreadable-note";
import { NotesUnavailable } from "../../../domain/errors/notes-unavailable";
import { Note } from "../../../domain/note";
import type { NotePath } from "../../../domain/note-path";
import { NoteVersion } from "../../../domain/note-version";
import { decodeBase64 } from "./base64-text";
import type { GitHubAccess } from "./github-gateway";
import type { FailureContext } from "./github-error-translator";

const FILE = "file";
const BASE64 = "base64";
const STRICT: TextDecoding = "strict";
const BRANCH_LEVEL: FailureContext = {};

export type TextDecoding = "strict" | "lossy";

export interface NoteReader {
  read(path: NotePath, ref: string, decoding?: TextDecoding): Promise<Note>;
  versionOf(path: NotePath, ref: string): Promise<NoteVersion>;
  exists(path: NotePath, ref: string): Promise<boolean>;
  headCommit(): Promise<string>;
}

export class GitHubNoteReader implements NoteReader {
  constructor(private readonly github: GitHubAccess) {}

  async read(path: NotePath, ref: string, decoding: TextDecoding = STRICT): Promise<Note> {
    const data = await this.getFile(path, ref);
    const encoded = data.encoding === BASE64 ? data.content : await this.readBlob(data.sha);
    const content = this.decode(path, encoded, decoding === STRICT);
    return new Note(path, content, NoteVersion.of(data.sha));
  }

  async versionOf(path: NotePath, ref: string): Promise<NoteVersion> {
    return NoteVersion.of((await this.getFile(path, ref)).sha);
  }

  async exists(path: NotePath, ref: string): Promise<boolean> {
    return this.getContent(path, ref).then(
      () => true,
      (error: unknown) => this.treatMissingAsAbsent(error),
    );
  }

  async headCommit(): Promise<string> {
    const { data } = await this.github.send(BRANCH_LEVEL, (client, repo) =>
      client.rest.git.getRef({ ...repo, ref: this.github.branchRef }),
    );
    return data.object.sha;
  }

  private async readBlob(sha: string): Promise<string> {
    const { data } = await this.github.send(BRANCH_LEVEL, (client, repo) =>
      client.rest.git.getBlob({ ...repo, file_sha: sha }),
    );
    if (data.encoding !== BASE64) throw new NotesUnavailable();
    return data.content;
  }

  private async getFile(path: NotePath, ref: string) {
    const data = await this.getContent(path, ref);
    if (Array.isArray(data) || data.type !== FILE || !("content" in data)) {
      throw new NoteNotFound(path.value);
    }
    return data;
  }

  private decode(path: NotePath, encoded: string, strict: boolean): string {
    try {
      return decodeBase64(encoded, strict);
    } catch (error) {
      if (error instanceof TypeError) throw new UnreadableNote(path.value);
      throw error;
    }
  }

  private async getContent(path: NotePath, ref: string) {
    const context = { path: path.value, mayBeMissing: true };
    const { data } = await this.github.send(context, (client, repo) =>
      client.rest.repos.getContent({ ...repo, path: path.value, ref }),
    );
    return data;
  }

  private treatMissingAsAbsent(error: unknown): boolean {
    if (error instanceof NoteNotFound) return false;
    throw error;
  }
}
