import type { CallToolResult } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { SaveIdeaInput } from "../../../../application/use-cases/save-idea";
import type { NoteView } from "../../../../application/use-cases/note-view";
import type { ToolReplies } from "../tool-results";
import type { ToolCallRunner } from "../tool-runner";
import { NoteTool } from "./note-tool";
import { LABEL, TEXT } from "./tool-fields";
import type { UseCase } from "./use-case";

const SCHEMA = z.object({
  title: LABEL.describe("Short title"),
  content: TEXT.describe("Markdown body"),
});

export class SaveIdeaTool extends NoteTool<typeof SCHEMA> {
  protected readonly name = "save_idea";
  protected readonly description = "Save a quick idea as a new dated note in the ideas folder.";
  protected readonly schema = SCHEMA;

  constructor(
    runner: ToolCallRunner,
    private readonly results: ToolReplies,
    private readonly useCase: UseCase<SaveIdeaInput, NoteView>,
  ) {
    super(runner);
  }

  protected async handle(input: z.infer<typeof SCHEMA>): Promise<CallToolResult> {
    return this.results.saved(await this.useCase.execute(input));
  }
}
