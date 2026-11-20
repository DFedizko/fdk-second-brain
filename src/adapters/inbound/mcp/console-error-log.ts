import type { ErrorLog } from "./error-log";

const LABEL = "MCP tool failed:";

export class ConsoleErrorLog implements ErrorLog {
    report(error: unknown): void {
        console.error(LABEL, error);
    }
}
