import type { Note } from "../../domain/note";
import { NotePath } from "../../domain/note-path";
import { NoteVersion } from "../../domain/note-version";
import { PassageEdit } from "../../domain/passage-edit";
import type { NoteRepository } from "../ports/note-repository";
import { toNoteView, type NoteView } from "./note-view";

export interface EditNoteInput {
    readonly path: string;
    readonly passage: string;
    readonly replacement: string;
    readonly expectedVersion?: string;
}

export class EditNote {
    constructor(private readonly repository: NoteRepository) {}

    async execute(input: EditNoteInput): Promise<NoteView> {
        const note = await this.repository.read(NotePath.of(input.path));
        this.rejectStaleVersion(note, input.expectedVersion);
        const content = new PassageEdit(input.passage, input.replacement).applyTo(note.content);
        return toNoteView(await this.repository.write(note.path, content, note.version));
    }

    private rejectStaleVersion(note: Note, expectedVersion?: string): void {
        if (expectedVersion !== undefined) note.ensureVersion(NoteVersion.of(expectedVersion));
    }
}
