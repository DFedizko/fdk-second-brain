import type { CallToolResult } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { WriteNoteInput } from "../../../../application/use-cases/write-note";
import type { NoteView } from "../../../../application/use-cases/note-view";
import type { ToolReplies } from "../tool-results";
import type { ToolCallRunner } from "../tool-runner";
import { NoteTool } from "./note-tool";
import type { UseCase } from "./use-case";
import { EXPECTED_VERSION, NOTE_PATH, TEXT } from "./tool-fields";

const SCHEMA = z.object({
  path: NOTE_PATH,
  content: TEXT.describe("Full Markdown content"),
  expectedVersion: EXPECTED_VERSION,
});

export class WriteNoteTool extends NoteTool<typeof SCHEMA> {
  protected readonly name = "write_note";
  protected readonly description =
    "Create a note, or replace a whole note when expectedVersion is given.";
  protected readonly schema = SCHEMA;

  constructor(
    runner: ToolCallRunner,
    private readonly results: ToolReplies,
    private readonly useCase: UseCase<WriteNoteInput, NoteView>,
  ) {
    super(runner);
  }

  protected async handle(input: z.infer<typeof SCHEMA>): Promise<CallToolResult> {
    return this.results.saved(await this.useCase.execute(input));
  }
}
