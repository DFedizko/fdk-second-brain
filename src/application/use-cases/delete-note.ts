import { NotePath } from "../../domain/note-path";
import type { NoteRepository } from "../ports/note-repository";

export interface DeleteNoteInput {
  readonly path: string;
}

export class DeleteNote {
  constructor(private readonly repository: NoteRepository) {}

  async execute(input: DeleteNoteInput): Promise<void> {
    await this.repository.delete(NotePath.of(input.path));
  }
}
