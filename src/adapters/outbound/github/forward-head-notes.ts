import type { NoteLookup } from "../../../application/ports/note-lookup";
import type { Note } from "../../../domain/note";
import type { NotePath } from "../../../domain/note-path";
import type { CommitCompare } from "./commit-compare";
import type { NoteReader } from "./github-note-reader";

// Each read resolves the head again and moves forward to it, so later passes see
// newer pushes, but never back to a head that only looks older because it lags.
export class ForwardHeadNotes implements NoteLookup {
  constructor(
    private readonly reader: NoteReader,
    private readonly commits: CommitCompare,
    private pinned: string,
  ) {}

  async read(path: NotePath): Promise<Note> {
    await this.moveToNewerHead();
    return this.reader.read(path, this.pinned);
  }

  private async moveToNewerHead(): Promise<void> {
    const head = await this.reader.headCommit();
    if (await this.commits.includes(head, this.pinned)) this.pinned = head;
  }
}
