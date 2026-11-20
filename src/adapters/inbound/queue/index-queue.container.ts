import { ContainerModule, type ServiceIdentifier } from "inversify";
import type { IndexFailureLog } from "../../../application/ports/index-failure-log";
import type { NoteIndexer } from "../../../application/use-cases/index-note";
import { LOGGING } from "../../outbound/logging/logging.symbols";
import { IndexQueueConsumer } from "./index-queue-consumer";
import { INDEX_QUEUE } from "./index-queue.symbols";

export function createIndexQueueModule(indexer: ServiceIdentifier<NoteIndexer>): ContainerModule {
  return new ContainerModule(({ bind }) => {
    bind(INDEX_QUEUE.consumer)
      .toResolvedValue(
        (notes: NoteIndexer, log: IndexFailureLog) => new IndexQueueConsumer(notes, log),
        [indexer, LOGGING.indexFailureLog],
      )
      .inSingletonScope();
  });
}
