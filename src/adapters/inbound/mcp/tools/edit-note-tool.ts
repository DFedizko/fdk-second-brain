import type { CallToolResult } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { EditNoteInput } from "../../../../application/use-cases/edit-note";
import type { NoteView } from "../../../../application/use-cases/note-view";
import type { ToolReplies } from "../tool-results";
import type { ToolCallRunner } from "../tool-runner";
import { NoteTool } from "./note-tool";
import type { UseCase } from "./use-case";
import { EXPECTED_VERSION, NOTE_PATH, PASSAGE, TEXT } from "./tool-fields";

const SCHEMA = z.object({
    path: NOTE_PATH,
    passage: PASSAGE.describe("Exact text to replace"),
    replacement: TEXT.describe("New text"),
    expectedVersion: EXPECTED_VERSION,
});

export class EditNoteTool extends NoteTool<typeof SCHEMA> {
    protected readonly name = "edit_note";
    protected readonly description = "Replace one passage of a note. The passage must appear exactly once.";
    protected readonly schema = SCHEMA;

    constructor(
        runner: ToolCallRunner,
        private readonly results: ToolReplies,
        private readonly useCase: UseCase<EditNoteInput, NoteView>,
    ) {
        super(runner);
    }

    protected async handle(input: z.infer<typeof SCHEMA>): Promise<CallToolResult> {
        return this.results.saved(await this.useCase.execute(input));
    }
}
