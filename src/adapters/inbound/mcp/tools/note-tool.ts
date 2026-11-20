import type { CallToolResult, McpServer, StandardSchemaWithJSON, ToolAnnotations } from "@modelcontextprotocol/server";
import type { z } from "zod";
import type { McpTool } from "../mcp-tool";
import type { ToolCallRunner } from "../tool-runner";

export abstract class NoteTool<Schema extends z.ZodObject> implements McpTool {
    protected abstract readonly name: string;
    protected abstract readonly description: string;
    protected abstract readonly schema: Schema;
    protected readonly annotations?: ToolAnnotations;

    constructor(private readonly runner: ToolCallRunner) {}

    register(server: McpServer): void {
        const config = {
            description: this.description,
            inputSchema: this.schema,
            annotations: this.annotations,
        };
        server.registerTool<StandardSchemaWithJSON, z.ZodObject>(this.name, config, (input) =>
            this.runner.run(() => this.handle(input as z.infer<Schema>)),
        );
    }

    protected abstract handle(input: z.infer<Schema>): Promise<CallToolResult>;
}
