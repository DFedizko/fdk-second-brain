import type { Bind, ServiceIdentifier } from "inversify";
import type { McpTool } from "../mcp-tool";
import { MCP } from "../mcp.symbols";
import type { ToolReplies } from "../tool-results";
import type { ToolCallRunner } from "../tool-runner";
import { DeleteNoteTool } from "./delete-note-tool";
import { EditNoteTool } from "./edit-note-tool";
import { ListNotesTool } from "./list-notes-tool";
import { MoveNoteTool } from "./move-note-tool";
import { ReadNoteTool } from "./read-note-tool";
import { ReadSectionTool } from "./read-section-tool";
import { SaveIdeaTool } from "./save-idea-tool";
import { SearchNotesTool } from "./search-notes-tool";
import type { ToolUseCases } from "./tool-use-cases";
import { WriteNoteTool } from "./write-note-tool";

type ToolClass<UseCase> = new (runner: ToolCallRunner, results: ToolReplies, useCase: UseCase) => McpTool;

export type ToolBinding = (bind: Bind) => void;

function bindTool<UseCase>(Tool: ToolClass<UseCase>, useCase: ServiceIdentifier<UseCase>): ToolBinding {
    return (bind) =>
        bind(MCP.tool)
            .toResolvedValue(
                (runner: ToolCallRunner, results: ToolReplies, driven: UseCase) => new Tool(runner, results, driven),
                [MCP.runner, MCP.results, useCase],
            )
            .inSingletonScope();
}

export function toolBindings(useCases: ToolUseCases): ToolBinding[] {
    return [
        bindTool(ListNotesTool, useCases.listNotes),
        bindTool(ReadNoteTool, useCases.readNote),
        bindTool(ReadSectionTool, useCases.readSection),
        bindTool(WriteNoteTool, useCases.writeNote),
        bindTool(EditNoteTool, useCases.editNote),
        bindTool(DeleteNoteTool, useCases.deleteNote),
        bindTool(MoveNoteTool, useCases.moveNote),
        bindTool(SaveIdeaTool, useCases.saveIdea),
        bindTool(SearchNotesTool, useCases.searchNotes),
    ];
}
