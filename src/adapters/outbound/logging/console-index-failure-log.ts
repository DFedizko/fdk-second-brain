import type { IndexFailure, IndexFailureLog } from "../../../application/ports/index-failure-log";

const LABEL = "Search index problem:";

export class ConsoleIndexFailureLog implements IndexFailureLog {
    report(failure: IndexFailure): void {
        console.error(LABEL, failure.path, failure.error);
    }
}
