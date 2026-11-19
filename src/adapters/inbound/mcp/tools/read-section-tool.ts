import type { CallToolResult } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { ReadSection } from "../../../../application/use-cases/read-section";
import type { ToolResults } from "../tool-results";
import type { ToolRunner } from "../tool-runner";
import { NoteTool } from "./note-tool";
import { NOTE_PATH, READ_ONLY } from "./tool-fields";

const SCHEMA = z.object({
  path: NOTE_PATH,
  heading: z.string().describe("Heading text, without the leading #"),
});

export class ReadSectionTool extends NoteTool<typeof SCHEMA> {
  protected readonly name = "read_section";
  protected readonly description =
    "Read one section of a note by its heading. Returns it, then the note version.";
  protected readonly schema = SCHEMA;
  protected override readonly annotations = READ_ONLY;

  constructor(
    runner: ToolRunner,
    private readonly results: ToolResults,
    private readonly useCase: ReadSection,
  ) {
    super(runner);
  }

  protected async handle(input: z.infer<typeof SCHEMA>): Promise<CallToolResult> {
    return this.results.note(await this.useCase.execute(input));
  }
}
