import { NotePath } from "../../domain/note-path";
import type { SearchIndex } from "../ports/search-index";
import type { IndexNoteResult } from "./index-note";

export interface DropNoteIndexInput {
  readonly path: string;
}

export interface IndexDropper {
  execute(input: DropNoteIndexInput): Promise<IndexNoteResult>;
}

export class DropNoteIndex implements IndexDropper {
  constructor(private readonly index: SearchIndex) {}

  async execute(input: DropNoteIndexInput): Promise<IndexNoteResult> {
    const path = NotePath.of(input.path);
    const indexed = await this.index.versionOf(path);
    const removed = indexed !== null && (await this.index.remove(path, indexed));
    return { path: path.value, status: removed ? "removed" : "unchanged" };
  }
}
