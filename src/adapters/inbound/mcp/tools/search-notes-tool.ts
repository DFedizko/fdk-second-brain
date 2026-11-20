import type { CallToolResult } from "@modelcontextprotocol/server";
import { z } from "zod";
import {
  DEFAULT_SEARCH_LIMIT,
  MAX_SEARCH_LIMIT,
  type SearchNotesInput,
  type SearchResult,
} from "../../../../application/use-cases/search-notes";
import type { ToolReplies } from "../tool-results";
import type { ToolCallRunner } from "../tool-runner";
import { NoteTool } from "./note-tool";
import { QUERY, READ_ONLY } from "./tool-fields";
import type { UseCase } from "./use-case";

const MIN_LIMIT = 1;

const SCHEMA = z.object({
  query: QUERY.describe("Keywords to look for"),
  limit: z
    .int()
    .min(MIN_LIMIT)
    .max(MAX_SEARCH_LIMIT)
    .optional()
    .describe(`Most results to return (default ${DEFAULT_SEARCH_LIMIT})`),
});

export class SearchNotesTool extends NoteTool<typeof SCHEMA> {
  protected readonly name = "search_notes";
  protected readonly description =
    "Search notes by keywords. Each result shows a path, a heading and a short snippet; open one with read_section or read_note.";
  protected readonly schema = SCHEMA;
  protected override readonly annotations = READ_ONLY;

  constructor(
    runner: ToolCallRunner,
    private readonly results: ToolReplies,
    private readonly useCase: UseCase<SearchNotesInput, SearchResult[]>,
  ) {
    super(runner);
  }

  protected async handle(input: z.infer<typeof SCHEMA>): Promise<CallToolResult> {
    return this.results.hits(await this.useCase.execute(input));
  }
}
