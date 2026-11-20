import { ContainerModule, type ServiceIdentifier } from "inversify";
import type { Clock } from "../../../application/ports/clock";
import type { IndexFailureLog } from "../../../application/ports/index-failure-log";
import type { PushedNoteIndexer } from "../../../application/use-cases/index-pushed-note";
import { CLOCK } from "../../outbound/clock/clock.symbols";
import { LOGGING } from "../../outbound/logging/logging.symbols";
import { IndexQueueConsumer } from "./index-queue-consumer";
import { INDEX_QUEUE } from "./index-queue.symbols";

export function createIndexQueueModule(indexer: ServiceIdentifier<PushedNoteIndexer>): ContainerModule {
    return new ContainerModule(({ bind }) => {
        bind(INDEX_QUEUE.consumer)
            .toResolvedValue(
                (notes: PushedNoteIndexer, log: IndexFailureLog, clock: Clock) =>
                    new IndexQueueConsumer(notes, log, clock),
                [indexer, LOGGING.indexFailureLog, CLOCK.clock],
            )
            .inSingletonScope();
    });
}
