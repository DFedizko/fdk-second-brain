import type { BranchHead } from "../../../application/ports/branch-head";
import type { NoteLookup } from "../../../application/ports/note-lookup";
import type { CommitHistory } from "./commit-compare";
import { ForwardHeadNotes } from "./forward-head-notes";
import type { NoteReader } from "./github-note-reader";

export class GitHubBranchHead implements BranchHead {
  constructor(
    private readonly reader: NoteReader,
    private readonly commits: CommitHistory,
  ) {}

  async readerAt(commit: string): Promise<NoteLookup | null> {
    const head = await this.reader.headCommit();
    if (!(await this.commits.includes(head, commit))) return null;
    return new ForwardHeadNotes(this.reader, this.commits, head);
  }
}
