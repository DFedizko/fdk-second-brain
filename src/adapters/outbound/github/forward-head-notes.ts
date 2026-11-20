import type { Note } from "../../../domain/note";
import type { NotePath } from "../../../domain/note-path";
import type { CommitHistory } from "./commit-compare";
import type { PinnableNotes } from "./head-notes-factory";
import type { NoteReader } from "./github-note-reader";

const UNPINNED = "";

export class ForwardHeadNotes implements PinnableNotes {
  private freshlyChecked = true;
  private pinned = UNPINNED;

  constructor(
    private readonly reader: NoteReader,
    private readonly history: CommitHistory,
  ) {}

  async pinTo(commit: string): Promise<boolean> {
    const head = await this.reader.headCommit();
    if (!(await this.history.includes(head, commit))) return false;
    this.pinned = head;
    return true;
  }

  async pinToHead(): Promise<void> {
    this.pinned = await this.reader.headCommit();
  }

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
