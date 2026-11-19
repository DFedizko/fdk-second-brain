import type { CallToolResult } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { MoveNote } from "../../../../application/use-cases/move-note";
import type { ToolResults } from "../tool-results";
import type { ToolRunner } from "../tool-runner";
import { NoteTool } from "./note-tool";
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
    runner: ToolRunner,
    private readonly results: ToolResults,
    private readonly useCase: MoveNote,
  ) {
    super(runner);
  }

  protected async handle(input: z.infer<typeof SCHEMA>): Promise<CallToolResult> {
    return this.results.saved(await this.useCase.execute(input));
  }
}
