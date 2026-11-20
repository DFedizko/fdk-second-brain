import type { PathQueue } from "../../../application/ports/path-queue";
import type { NotePath } from "../../../domain/note-path";
import type { IndexMessage } from "../../../shared/contracts/index-message";

// A sendBatch takes at most 100 messages and 256 KB; 50 keeps even 4 KB paths under it.
export const MAX_BATCH_MESSAGES = 50;

export type BatchSender = Pick<Queue<IndexMessage>, "sendBatch">;

export class CloudflarePathQueue implements PathQueue {
  constructor(private readonly queue: BatchSender) {}

  async enqueue(paths: readonly NotePath[], commit?: string): Promise<void> {
    const batches = this.splitIntoBatches(paths);
    await Promise.all(batches.map((batch) => this.send(batch, commit)));
  }

  private splitIntoBatches(paths: readonly NotePath[]): NotePath[][] {
    const count = Math.ceil(paths.length / MAX_BATCH_MESSAGES);
    return Array.from({ length: count }, (_, place) =>
      paths.slice(place * MAX_BATCH_MESSAGES, (place + 1) * MAX_BATCH_MESSAGES),
    );
  }

  private async send(batch: readonly NotePath[], commit?: string): Promise<void> {
    await this.queue.sendBatch(batch.map((path) => ({ body: this.toMessage(path, commit) })));
  }

  private toMessage(path: NotePath, commit?: string): IndexMessage {
    return commit === undefined ? { path: path.value } : { path: path.value, commit };
  }
}
