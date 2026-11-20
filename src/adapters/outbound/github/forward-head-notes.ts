import type { NoteLookup } from "../../../application/ports/note-lookup";
import type { Note } from "../../../domain/note";
import type { NotePath } from "../../../domain/note-path";
import type { CommitHistory } from "./commit-compare";
import type { NoteReader } from "./github-note-reader";

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
