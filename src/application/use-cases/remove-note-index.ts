import { NotePath } from "../../domain/note-path";
import type { SearchIndex } from "../ports/search-index";

export interface RemoveNoteIndexInput {
  readonly path: string;
}

export class RemoveNoteIndex {
  constructor(private readonly index: SearchIndex) {}

  async execute(input: RemoveNoteIndexInput): Promise<void> {
    await this.index.remove(NotePath.of(input.path));
  }
}
