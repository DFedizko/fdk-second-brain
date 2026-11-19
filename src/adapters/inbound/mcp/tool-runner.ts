import type { CallToolResult } from "@modelcontextprotocol/server";
import type { ToolErrorMapper } from "./tool-error-mapper";

export type ToolCall = () => Promise<CallToolResult>;

export class ToolRunner {
  constructor(private readonly errors: ToolErrorMapper) {}

  async run(call: ToolCall): Promise<CallToolResult> {
    try {
      return await call();
    } catch (error) {
      return this.errors.toResult(error);
    }
  }
}
