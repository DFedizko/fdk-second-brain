import { McpServer } from "@modelcontextprotocol/server";
import type { McpTool } from "./mcp-tool";

const SERVER_INFO = { name: "second-brain", version: "0.1.0" };
const INSTRUCTIONS =
  "The user's Markdown notes. To change a note, read it first and pass its version as expectedVersion.";

export class NotesMcpServer {
  constructor(private readonly tools: readonly McpTool[]) {}

  build(): McpServer {
    const server = new McpServer(SERVER_INFO, { instructions: INSTRUCTIONS });
    this.tools.forEach((tool) => tool.register(server));
    return server;
  }
}
