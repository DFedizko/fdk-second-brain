import type { NoteLookup } from "../../../application/ports/note-lookup";
import type { Note } from "../../../domain/note";
import type { NotePath } from "../../../domain/note-path";
import type { CommitHistory } from "./commit-compare";
import type { NoteReader } from "./github-note-reader";

// The first read uses the head just checked. Each later read resolves the head
// again and moves only to a head built on top of the pinned one, so later passes
// see newer pushes but never a lagging or older history.
export class ForwardHeadNotes implements NoteLookup {
  private freshlyChecked = true;

  constructor(
    private readonly reader: NoteReader,
    private readonly history: CommitHistory,
    private pinned: string,
  ) {}

  async read(path: NotePath): Promise<Note> {
    if (!this.freshlyChecked) await this.moveToNewerHead();
    this.freshlyChecked = false;
    return this.reader.read(path, this.pinned);
  }

  private async moveToNewerHead(): Promise<void> {
    const head = await this.reader.headCommit();
    if (await this.history.descendsFrom(head, this.pinned)) this.pinned = head;
  }
}
