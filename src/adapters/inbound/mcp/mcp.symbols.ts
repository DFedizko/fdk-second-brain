import type { McpHttpHandler } from "@modelcontextprotocol/server";
import type { ServiceIdentifier } from "inversify";
import type { McpTool } from "./mcp-tool";
import type { NotesMcpServer } from "./notes-mcp-server";
import type { ErrorLog } from "./error-log";
import type { ErrorResultMapper } from "./tool-error-mapper";
import type { ToolReplies } from "./tool-results";
import type { ToolCallRunner } from "./tool-runner";

export const MCP = {
  errorMapper: Symbol.for("McpToolErrorMapper") as ServiceIdentifier<ErrorResultMapper>,
  runner: Symbol.for("McpToolRunner") as ServiceIdentifier<ToolCallRunner>,
  results: Symbol.for("McpToolResults") as ServiceIdentifier<ToolReplies>,
  errorLog: Symbol.for("McpErrorLog") as ServiceIdentifier<ErrorLog>,
  tool: Symbol.for("McpTool") as ServiceIdentifier<McpTool>,
  server: Symbol.for("NotesMcpServer") as ServiceIdentifier<NotesMcpServer>,
  httpHandler: Symbol.for("McpHttpHandler") as ServiceIdentifier<McpHttpHandler>,
} as const;
