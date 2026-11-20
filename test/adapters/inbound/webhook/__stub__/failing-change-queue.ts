import type { ChangeQueue } from "../../../../../src/adapters/inbound/webhook/github-webhook-route";
import type { QueueNoteChangesResult } from "../../../../../src/application/use-cases/queue-note-changes";

export class FailingChangeQueue implements ChangeQueue {
    constructor(private readonly error: Error) {}

    async execute(): Promise<QueueNoteChangesResult> {
        throw this.error;
    }
}
