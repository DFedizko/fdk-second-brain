import type { ServiceIdentifier } from "inversify";
import type { IndexQueueConsumer } from "./index-queue-consumer";

export const INDEX_QUEUE = {
    consumer: Symbol.for("IndexQueueConsumer") as ServiceIdentifier<IndexQueueConsumer>,
} as const;
