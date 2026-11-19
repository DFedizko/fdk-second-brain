import type { CallToolResult } from "@modelcontextprotocol/server";
import { DomainError } from "../../../domain/errors/domain-error";
import type { ErrorLog } from "./error-log";
import type { ErrorResultMapper } from "./tool-error-mapper";

export type ToolCall = () => Promise<CallToolResult>;

export interface ToolCallRunner {
  run(call: ToolCall): Promise<CallToolResult>;
}

export class ToolRunner implements ToolCallRunner {
  constructor(
    private readonly errors: ErrorResultMapper,
    private readonly log: ErrorLog,
  ) {}

  async run(call: ToolCall): Promise<CallToolResult> {
    try {
      return await call();
    } catch (error) {
      this.reportUnexpected(error);
      return this.errors.toResult(error);
    }
  }

  private reportUnexpected(error: unknown): void {
    if (!(error instanceof DomainError)) this.log.report(error);
  }
}
