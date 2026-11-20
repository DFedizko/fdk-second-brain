import type { NoteCatalog, NoteStamp } from "../../../application/ports/note-catalog";
import { InvalidPath } from "../../../domain/errors/invalid-path";
import { NotesUnavailable } from "../../../domain/errors/notes-unavailable";
import { NotePath } from "../../../domain/note-path";
import { NoteVersion } from "../../../domain/note-version";
import { EmptyRepository } from "./empty-repository";
import type { FailureContext } from "./github-error-translator";
import type { GitHubAccess } from "./github-gateway";
import type { NoteReader } from "./github-note-reader";

const BLOB = "blob";
const RECURSIVE = "1";
const NOTE_EXTENSION = ".md";
const BRANCH_LEVEL: FailureContext = {};

interface TreeEntry {
  readonly path: string;
  readonly type: string;
  readonly sha: string;
}

export class GitHubNoteCatalog implements NoteCatalog {
  constructor(
    private readonly github: GitHubAccess,
    private readonly reader: NoteReader,
  ) {}

  async stamps(): Promise<NoteStamp[]> {
    const entries = await this.treeEntries().catch((error: unknown) => {
      if (error instanceof EmptyRepository) return [];
      throw error;
    });
    return entries
      .filter((entry) => entry.type === BLOB && entry.path.endsWith(NOTE_EXTENSION))
      .flatMap((entry) => this.toStamp(entry));
  }

  private async treeEntries(): Promise<TreeEntry[]> {
    const head = await this.reader.headCommit();
    const { data } = await this.github.send(BRANCH_LEVEL, (client, repo) =>
      client.rest.git.getTree({ ...repo, tree_sha: head, recursive: RECURSIVE }),
    );
    if (data.truncated) throw new NotesUnavailable();
    return data.tree.map((entry) => ({
      path: entry.path ?? "",
      type: entry.type ?? "",
      sha: entry.sha ?? "",
    }));
  }

  private toStamp(entry: TreeEntry): NoteStamp[] {
    try {
      return [{ path: NotePath.of(entry.path), version: NoteVersion.of(entry.sha) }];
    } catch (error) {
      if (error instanceof InvalidPath) return [];
      throw error;
    }
  }
}
