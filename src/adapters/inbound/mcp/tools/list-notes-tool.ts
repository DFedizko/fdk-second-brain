import type { CallToolResult } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { ListNotes } from "../../../../application/use-cases/list-notes";
import type { ToolReplies } from "../tool-results";
import type { ToolCallRunner } from "../tool-runner";
import { NoteTool } from "./note-tool";
import { READ_ONLY } from "./tool-fields";

const SCHEMA = z.object({
  folder: z.string().optional().describe("Only list notes under this folder"),
});

export class ListNotesTool extends NoteTool<typeof SCHEMA> {
  protected readonly name = "list_notes";
  protected readonly description = "List note paths.";
  protected readonly schema = SCHEMA;
  protected override readonly annotations = READ_ONLY;

  constructor(
    runner: ToolCallRunner,
    private readonly results: ToolReplies,
    private readonly useCase: ListNotes,
  ) {
    super(runner);
  }

  protected async handle(input: z.infer<typeof SCHEMA>): Promise<CallToolResult> {
    return this.results.paths(await this.useCase.execute(input));
  }
}
