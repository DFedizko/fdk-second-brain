import type { McpHttpHandler } from "@modelcontextprotocol/server";
import type { ServiceIdentifier } from "inversify";
import type { McpTool } from "./mcp-tool";
import type { NotesMcpServer } from "./notes-mcp-server";
import type { ToolErrorMapper } from "./tool-error-mapper";
import type { ToolResults } from "./tool-results";
import type { ToolRunner } from "./tool-runner";

export const MCP = {
  errorMapper: Symbol.for("McpToolErrorMapper") as ServiceIdentifier<ToolErrorMapper>,
  runner: Symbol.for("McpToolRunner") as ServiceIdentifier<ToolRunner>,
  results: Symbol.for("McpToolResults") as ServiceIdentifier<ToolResults>,
  tool: Symbol.for("McpTool") as ServiceIdentifier<McpTool>,
  server: Symbol.for("NotesMcpServer") as ServiceIdentifier<NotesMcpServer>,
  httpHandler: Symbol.for("McpHttpHandler") as ServiceIdentifier<McpHttpHandler>,
} as const;
