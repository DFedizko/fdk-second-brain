import type { ServiceIdentifier } from "inversify";
import type { PathQueue } from "../../../application/ports/path-queue";
import type { IndexMessage } from "../../../shared/contracts/index-message";

export const QUEUE = {
    binding: Symbol.for("IndexQueueBinding") as ServiceIdentifier<Queue<IndexMessage>>,
    pathQueue: Symbol.for("PathQueue") as ServiceIdentifier<PathQueue>,
} as const;
