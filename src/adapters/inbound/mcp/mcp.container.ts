import { createMcpHandler } from "@modelcontextprotocol/server";
import { ContainerModule } from "inversify";
import { ConsoleErrorLog } from "./console-error-log";
import type { ErrorLog } from "./error-log";
import type { McpTool } from "./mcp-tool";
import { MCP } from "./mcp.symbols";
import { NotesMcpServer } from "./notes-mcp-server";
import { ToolErrorMapper, type ErrorResultMapper } from "./tool-error-mapper";
import { ToolResults } from "./tool-results";
import { ToolRunner } from "./tool-runner";
import { toolBindings } from "./tools/tool-bindings";
import type { ToolUseCases } from "./tools/tool-use-cases";

const ALL_TOOLS = { serviceIdentifier: MCP.tool, isMultiple: true } as const;

export function createMcpModule(useCases: ToolUseCases): ContainerModule {
    return new ContainerModule(({ bind }) => {
        bind(MCP.errorMapper)
            .toResolvedValue(() => new ToolErrorMapper())
            .inSingletonScope();
        bind(MCP.errorLog)
            .toResolvedValue(() => new ConsoleErrorLog())
            .inSingletonScope();
        bind(MCP.runner)
            .toResolvedValue(
                (errors: ErrorResultMapper, log: ErrorLog) => new ToolRunner(errors, log),
                [MCP.errorMapper, MCP.errorLog],
            )
            .inSingletonScope();
        bind(MCP.results)
            .toResolvedValue(() => new ToolResults())
            .inSingletonScope();
        toolBindings(useCases).forEach((bindTool) => bindTool(bind));
        bind(MCP.server)
            .toResolvedValue((tools: McpTool[]) => new NotesMcpServer(tools), [ALL_TOOLS])
            .inSingletonScope();
        bind(MCP.httpHandler)
            .toResolvedValue(
                (server: NotesMcpServer, log: ErrorLog) =>
                    createMcpHandler(() => server.build(), { onerror: (error) => log.report(error) }),
                [MCP.server, MCP.errorLog],
            )
            .inSingletonScope();
    });
}
