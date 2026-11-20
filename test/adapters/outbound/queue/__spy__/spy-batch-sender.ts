import type { BatchSender } from "../../../../../src/adapters/outbound/queue/cloudflare-path-queue";
import type { IndexMessage } from "../../../../../src/shared/contracts/index-message";

const SENT: QueueSendBatchResponse = { metadata: { metrics: { backlogCount: 0, backlogBytes: 0 } } };

export class SpyBatchSender implements BatchSender {
  readonly batches: IndexMessage[][] = [];

  async sendBatch(messages: Iterable<MessageSendRequest<IndexMessage>>) {
    this.batches.push([...messages].map((message) => message.body));
    return SENT;
  }
}
