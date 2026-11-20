import { NotePath } from "../../domain/note-path";
import type { NoteRepository } from "../ports/note-repository";
import { toMovedView, type MovedNoteView } from "./note-view";

export interface MoveNoteInput {
  readonly from: string;
  readonly to: string;
}

export class MoveNote {
  constructor(private readonly repository: NoteRepository) {}

  async execute(input: MoveNoteInput): Promise<MovedNoteView> {
    const moved = await this.repository.move(NotePath.of(input.from), NotePath.of(input.to));
    return toMovedView(moved);
  }
}
