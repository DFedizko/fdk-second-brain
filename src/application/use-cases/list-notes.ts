import { NoteFolder } from "../../domain/note-folder";
import type { NoteRepository } from "../ports/note-repository";

const ROOT_FOLDER = "";

export interface ListNotesInput {
  readonly folder?: string;
}

export class ListNotes {
  constructor(private readonly repository: NoteRepository) {}

  async execute(input: ListNotesInput): Promise<string[]> {
    const paths = await this.repository.list(NoteFolder.of(input.folder ?? ROOT_FOLDER));
    return paths.map((path) => path.value);
  }
}
