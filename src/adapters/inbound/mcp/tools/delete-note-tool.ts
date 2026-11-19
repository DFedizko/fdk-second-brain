import type { CallToolResult } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { DeleteNoteInput } from "../../../../application/use-cases/delete-note";
import type { ToolReplies } from "../tool-results";
import type { ToolCallRunner } from "../tool-runner";
import { NoteTool } from "./note-tool";
import type { UseCase } from "./use-case";
import { DESTRUCTIVE, NOTE_PATH } from "./tool-fields";

const SCHEMA = z.object({
  path: NOTE_PATH,
});

export class DeleteNoteTool extends NoteTool<typeof SCHEMA> {
  protected readonly name = "delete_note";
  protected readonly description = "Delete a note.";
  protected readonly schema = SCHEMA;
  protected override readonly annotations = DESTRUCTIVE;

  constructor(
    runner: ToolCallRunner,
    private readonly results: ToolReplies,
    private readonly useCase: UseCase<DeleteNoteInput, void>,
  ) {
    super(runner);
  }

  protected async handle(input: z.infer<typeof SCHEMA>): Promise<CallToolResult> {
    await this.useCase.execute(input);
    return this.results.deleted(input.path);
  }
}
