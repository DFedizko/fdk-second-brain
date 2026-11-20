import { Container } from "inversify";
import { IndexQueueConsumer } from "../../../../src/adapters/inbound/queue/index-queue-consumer";
import { createIndexQueueModule } from "../../../../src/adapters/inbound/queue/index-queue.container";
import { INDEX_QUEUE } from "../../../../src/adapters/inbound/queue/index-queue.symbols";
import { LOGGING } from "../../../../src/adapters/outbound/logging/logging.symbols";
import { SpyIndexFailureLog } from "../../../__spy__/spy-index-failure-log";
import { SpyNoteIndexer } from "../../../application/use-cases/__spy__/spy-note-indexer";
import { FakeMessageBatch } from "./__fake__/fake-message-batch";

const INDEXER = Symbol.for("TestNoteIndexer");
const PLAN = "projects/plan.md";

describe("createIndexQueueModule", () => {
  let indexer: SpyNoteIndexer;
  let container: Container;

  beforeEach(() => {
    indexer = new SpyNoteIndexer();
    container = new Container();
    container.bind(INDEXER).toConstantValue(indexer);
    container.bind(LOGGING.indexFailureLog).toConstantValue(new SpyIndexFailureLog());
    container.load(createIndexQueueModule(INDEXER));
  });

  it("binds the index queue consumer", () => {
    const consumer = container.get(INDEX_QUEUE.consumer);

    expect(consumer).toBeInstanceOf(IndexQueueConsumer);
  });

  it("hands queued paths to the given indexer", async () => {
    await container.get(INDEX_QUEUE.consumer).handle(FakeMessageBatch.of([{ path: PLAN }]));

    expect(indexer.paths).toEqual([PLAN]);
  });
});
