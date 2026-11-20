import type { ErrorLog } from "../../../../../src/adapters/inbound/mcp/error-log";

export class SpyErrorLog implements ErrorLog {
    readonly reported: unknown[] = [];

    report(error: unknown): void {
        this.reported.push(error);
    }
}
