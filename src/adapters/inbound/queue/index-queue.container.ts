import { ContainerModule, type ServiceIdentifier } from "inversify";
import type { Clock } from "../../../application/ports/clock";
import type { IndexFailureLog } from "../../../application/ports/index-failure-log";
import type { IndexDropper } from "../../../application/use-cases/drop-note-index";
import type { PushedNoteIndexer } from "../../../application/use-cases/index-pushed-note";
import { CLOCK } from "../../outbound/clock/clock.symbols";
import { LOGGING } from "../../outbound/logging/logging.symbols";
import { IndexQueueConsumer } from "./index-queue-consumer";
import { INDEX_QUEUE } from "./index-queue.symbols";

export interface IndexQueueWiring {
  readonly indexer: ServiceIdentifier<PushedNoteIndexer>;
  readonly dropper: ServiceIdentifier<IndexDropper>;
}

export function createIndexQueueModule(wiring: IndexQueueWiring): ContainerModule {
  return new ContainerModule(({ bind }) => {
    bind(INDEX_QUEUE.consumer)
      .toResolvedValue(
        (notes: PushedNoteIndexer, dropper: IndexDropper, log: IndexFailureLog, clock: Clock) =>
          new IndexQueueConsumer(notes, dropper, log, clock),
        [wiring.indexer, wiring.dropper, LOGGING.indexFailureLog, CLOCK.clock],
      )
      .inSingletonScope();
  });
}
