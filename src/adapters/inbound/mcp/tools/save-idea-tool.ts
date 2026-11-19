import type { CallToolResult } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { SaveIdea } from "../../../../application/use-cases/save-idea";
import type { ToolResults } from "../tool-results";
import type { ToolRunner } from "../tool-runner";
import { NoteTool } from "./note-tool";

const SCHEMA = z.object({
  title: z.string().describe("Short title"),
  content: z.string().describe("Markdown body"),
});

export class SaveIdeaTool extends NoteTool<typeof SCHEMA> {
  protected readonly name = "save_idea";
  protected readonly description = "Save a quick idea as a new dated note in the ideas folder.";
  protected readonly schema = SCHEMA;

  constructor(
    runner: ToolRunner,
    private readonly results: ToolResults,
    private readonly useCase: SaveIdea,
  ) {
    super(runner);
  }

  protected async handle(input: z.infer<typeof SCHEMA>): Promise<CallToolResult> {
    return this.results.saved(await this.useCase.execute(input));
  }
}
