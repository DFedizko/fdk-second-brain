import type { CallToolResult } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { MoveNoteInput } from "../../../../application/use-cases/move-note";
import type { NoteView } from "../../../../application/use-cases/note-view";
import type { ToolReplies } from "../tool-results";
import type { ToolCallRunner } from "../tool-runner";
import { NoteTool } from "./note-tool";
import type { UseCase } from "./use-case";
import { NOTE_PATH } from "./tool-fields";

const SCHEMA = z.object({
  from: NOTE_PATH,
  to: NOTE_PATH,
});

export class MoveNoteTool extends NoteTool<typeof SCHEMA> {
  protected readonly name = "move_note";
  protected readonly description = "Move or rename a note.";
  protected readonly schema = SCHEMA;

  constructor(
    runner: ToolCallRunner,
    private readonly results: ToolReplies,
    private readonly useCase: UseCase<MoveNoteInput, NoteView>,
  ) {
    super(runner);
  }

  protected async handle(input: z.infer<typeof SCHEMA>): Promise<CallToolResult> {
    return this.results.saved(await this.useCase.execute(input));
  }
}
