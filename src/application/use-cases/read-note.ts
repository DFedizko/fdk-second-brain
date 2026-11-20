import { NotePath } from "../../domain/note-path";
import type { NoteRepository } from "../ports/note-repository";
import { toNoteView, type NoteView } from "./note-view";

export interface ReadNoteInput {
    readonly path: string;
}

export class ReadNote {
    constructor(private readonly repository: NoteRepository) {}

    async execute(input: ReadNoteInput): Promise<NoteView> {
        return toNoteView(await this.repository.read(NotePath.of(input.path)));
    }
}
