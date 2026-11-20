import { ContainerModule, type ServiceIdentifier } from "inversify";
import type { IndexFailureLog } from "../../../application/ports/index-failure-log";
import type { PushedNoteIndexer } from "../../../application/use-cases/index-pushed-note";
import { LOGGING } from "../../outbound/logging/logging.symbols";
import { IndexQueueConsumer } from "./index-queue-consumer";
import { INDEX_QUEUE } from "./index-queue.symbols";

export function createIndexQueueModule(
  indexer: ServiceIdentifier<PushedNoteIndexer>,
): ContainerModule {
  return new ContainerModule(({ bind }) => {
    bind(INDEX_QUEUE.consumer)
      .toResolvedValue(
        (notes: PushedNoteIndexer, log: IndexFailureLog) => new IndexQueueConsumer(notes, log),
        [indexer, LOGGING.indexFailureLog],
      )
      .inSingletonScope();
  });
}
