import { InvalidPath } from "../../domain/errors/invalid-path";
import { NotePath } from "../../domain/note-path";
import type { PathQueue } from "../ports/path-queue";

export interface QueueNoteChangesInput {
    readonly paths: readonly string[];
    readonly commit?: string;
}

export interface QueueNoteChangesResult {
    readonly queued: number;
}

export class QueueNoteChanges {
    constructor(private readonly queue: PathQueue) {}

    async execute(input: QueueNoteChangesInput): Promise<QueueNoteChangesResult> {
        const notes = [...new Set(input.paths)].flatMap((raw) => this.toNotePath(raw));
        if (notes.length > 0) await this.queue.enqueue(notes, input.commit);
        return { queued: notes.length };
    }

    private toNotePath(raw: string): NotePath[] {
        try {
            return [NotePath.of(raw)];
        } catch (error) {
            if (error instanceof InvalidPath) return [];
            throw error;
        }
    }
}
