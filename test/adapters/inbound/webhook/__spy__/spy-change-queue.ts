import type { ChangeQueue } from "../../../../../src/adapters/inbound/webhook/github-webhook-route";
import type {
    QueueNoteChangesInput,
    QueueNoteChangesResult,
} from "../../../../../src/application/use-cases/queue-note-changes";

export class SpyChangeQueue implements ChangeQueue {
    readonly calls: string[][] = [];
    readonly commits: (string | undefined)[] = [];

    async execute(input: QueueNoteChangesInput): Promise<QueueNoteChangesResult> {
        this.calls.push([...input.paths]);
        this.commits.push(input.commit);
        return { queued: input.paths.length };
    }
}
