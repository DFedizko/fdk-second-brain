import type { Bind, ServiceIdentifier } from "inversify";
import { USE_CASES } from "../../../../main/use-cases/use-cases.symbols";
import type { McpTool } from "../mcp-tool";
import { MCP } from "../mcp.symbols";
import type { ToolResults } from "../tool-results";
import type { ToolRunner } from "../tool-runner";
import { DeleteNoteTool } from "./delete-note-tool";
import { EditNoteTool } from "./edit-note-tool";
import { ListNotesTool } from "./list-notes-tool";
import { MoveNoteTool } from "./move-note-tool";
import { ReadNoteTool } from "./read-note-tool";
import { ReadSectionTool } from "./read-section-tool";
import { SaveIdeaTool } from "./save-idea-tool";
import { WriteNoteTool } from "./write-note-tool";

type ToolClass<UseCase> = new (
  runner: ToolRunner,
  results: ToolResults,
  useCase: UseCase,
) => McpTool;

export type ToolBinding = (bind: Bind) => void;

function bindTool<UseCase>(
  Tool: ToolClass<UseCase>,
  useCase: ServiceIdentifier<UseCase>,
): ToolBinding {
  return (bind) =>
    bind(MCP.tool)
      .toResolvedValue(
        (runner: ToolRunner, results: ToolResults, driven: UseCase) =>
          new Tool(runner, results, driven),
        [MCP.runner, MCP.results, useCase],
      )
      .inSingletonScope();
}

export const TOOL_BINDINGS: readonly ToolBinding[] = [
  bindTool(ListNotesTool, USE_CASES.listNotes),
  bindTool(ReadNoteTool, USE_CASES.readNote),
  bindTool(ReadSectionTool, USE_CASES.readSection),
  bindTool(WriteNoteTool, USE_CASES.writeNote),
  bindTool(EditNoteTool, USE_CASES.editNote),
  bindTool(DeleteNoteTool, USE_CASES.deleteNote),
  bindTool(MoveNoteTool, USE_CASES.moveNote),
  bindTool(SaveIdeaTool, USE_CASES.saveIdea),
];
