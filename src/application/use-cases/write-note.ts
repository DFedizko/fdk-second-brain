import type { Note } from "../../domain/note";
import { NotePath } from "../../domain/note-path";
import { NoteVersion } from "../../domain/note-version";
import type { NoteRepository } from "../ports/note-repository";
import { toNoteView, type NoteView } from "./note-view";

export interface WriteNoteInput {
    readonly path: string;
    readonly content: string;
    readonly expectedVersion?: string;
}

export class WriteNote {
    constructor(private readonly repository: NoteRepository) {}

    async execute(input: WriteNoteInput): Promise<NoteView> {
        return toNoteView(await this.saveNote(NotePath.of(input.path), input));
    }

    private saveNote(path: NotePath, input: WriteNoteInput): Promise<Note> {
        if (input.expectedVersion === undefined) return this.repository.create(path, input.content);
        const expected = NoteVersion.of(input.expectedVersion);
        return this.repository.write(path, input.content, expected);
    }
}
