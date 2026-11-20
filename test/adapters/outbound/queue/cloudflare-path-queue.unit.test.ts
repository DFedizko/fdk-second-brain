import {
  CloudflarePathQueue,
  MAX_BATCH_MESSAGES,
} from "../../../../src/adapters/outbound/queue/cloudflare-path-queue";
import { NotePath } from "../../../../src/domain/note-path";
import { SpyBatchSender } from "./__spy__/spy-batch-sender";

const PLAN = NotePath.of("projects/plan.md");
const IDEA = NotePath.of("ideas/idea.md");

function manyNotes(count: number): NotePath[] {
  return Array.from({ length: count }, (_, place) => NotePath.of(`notes/n-${place}.md`));
}

describe("CloudflarePathQueue", () => {
  let sender: SpyBatchSender;
  let queue: CloudflarePathQueue;

  beforeEach(() => {
    sender = new SpyBatchSender();
    queue = new CloudflarePathQueue(sender);
  });

  it("sends one message per path", async () => {
    await queue.enqueue([PLAN, IDEA]);

    expect(sender.batches).toEqual([[{ path: PLAN.value }, { path: IDEA.value }]]);
  });

  it("splits paths into batches the queue accepts", async () => {
    await queue.enqueue(manyNotes(MAX_BATCH_MESSAGES + 1));

    expect(sender.batches.map((batch) => batch.length)).toEqual([MAX_BATCH_MESSAGES, 1]);
  });
});
