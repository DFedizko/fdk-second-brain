import type { NoteSnapshot, NoteTree } from "../../../../src/application/ports/note-tree";
import { FixedNoteCatalog } from "./fixed-note-catalog";

export class FixedNoteTree implements NoteTree {
  readonly asked: (string | undefined)[] = [];

  constructor(
    private readonly versions: Readonly<Record<string, string>>,
    private readonly commit?: string,
  ) {}

  async snapshot(after?: string): Promise<NoteSnapshot> {
    this.asked.push(after);
    const stamps = await new FixedNoteCatalog(this.versions).stamps();
    return this.commit === undefined ? { stamps } : { commit: this.commit, stamps };
  }
}
