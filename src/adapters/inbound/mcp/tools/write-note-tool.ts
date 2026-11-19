import type { CallToolResult } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { WriteNote } from "../../../../application/use-cases/write-note";
import type { ToolResults } from "../tool-results";
import type { ToolRunner } from "../tool-runner";
import { NoteTool } from "./note-tool";
import { EXPECTED_VERSION, NOTE_PATH } from "./tool-fields";

const SCHEMA = z.object({
  path: NOTE_PATH,
  content: z.string().describe("Full Markdown content"),
  expectedVersion: EXPECTED_VERSION,
});

export class WriteNoteTool extends NoteTool<typeof SCHEMA> {
  protected readonly name = "write_note";
  protected readonly description =
    "Create a note, or replace a whole note when expectedVersion is given.";
  protected readonly schema = SCHEMA;

  constructor(
    runner: ToolRunner,
    private readonly results: ToolResults,
    private readonly useCase: WriteNote,
  ) {
    super(runner);
  }

  protected async handle(input: z.infer<typeof SCHEMA>): Promise<CallToolResult> {
    return this.results.saved(await this.useCase.execute(input));
  }
}
