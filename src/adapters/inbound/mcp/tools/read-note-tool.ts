import type { CallToolResult } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { ReadNote } from "../../../../application/use-cases/read-note";
import type { ToolReplies } from "../tool-results";
import type { ToolCallRunner } from "../tool-runner";
import { NoteTool } from "./note-tool";
import { NOTE_PATH, READ_ONLY } from "./tool-fields";

const SCHEMA = z.object({
  path: NOTE_PATH,
});

export class ReadNoteTool extends NoteTool<typeof SCHEMA> {
  protected readonly name = "read_note";
  protected readonly description = "Read a whole note. Returns its content, then its version.";
  protected readonly schema = SCHEMA;
  protected override readonly annotations = READ_ONLY;

  constructor(
    runner: ToolCallRunner,
    private readonly results: ToolReplies,
    private readonly useCase: ReadNote,
  ) {
    super(runner);
  }

  protected async handle(input: z.infer<typeof SCHEMA>): Promise<CallToolResult> {
    return this.results.note(await this.useCase.execute(input));
  }
}
