import type { IndexMessage } from "../shared/contracts/index-message";

export interface WorkerBindings {
    readonly DB: D1Database;
    readonly INDEX_QUEUE: Queue<IndexMessage>;
}
