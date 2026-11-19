import { createMcpHandler } from "@modelcontextprotocol/server";
import { ContainerModule } from "inversify";
import type { McpTool } from "./mcp-tool";
import { MCP } from "./mcp.symbols";
import { NotesMcpServer } from "./notes-mcp-server";
import { ToolErrorMapper } from "./tool-error-mapper";
import { ToolResults } from "./tool-results";
import { ToolRunner } from "./tool-runner";
import { TOOL_BINDINGS } from "./tools/tool-bindings";

const ALL_TOOLS = { serviceIdentifier: MCP.tool, isMultiple: true } as const;

export const mcpModule = new ContainerModule(({ bind }) => {
  bind(MCP.errorMapper)
    .toResolvedValue(() => new ToolErrorMapper())
    .inSingletonScope();
  bind(MCP.runner)
    .toResolvedValue((errors: ToolErrorMapper) => new ToolRunner(errors), [MCP.errorMapper])
    .inSingletonScope();
  bind(MCP.results)
    .toResolvedValue(() => new ToolResults())
    .inSingletonScope();
  TOOL_BINDINGS.forEach((bindTool) => bindTool(bind));
  bind(MCP.server)
    .toResolvedValue((tools: McpTool[]) => new NotesMcpServer(tools), [ALL_TOOLS])
    .inSingletonScope();
  bind(MCP.httpHandler)
    .toResolvedValue(
      (server: NotesMcpServer) => createMcpHandler(() => server.build()),
      [MCP.server],
    )
    .inSingletonScope();
});
