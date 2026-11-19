import { EditNoteTool } from "../../../../../src/adapters/inbound/mcp/tools/edit-note-tool";
import type { EditNoteInput } from "../../../../../src/application/use-cases/edit-note";
import type { NoteView } from "../../../../../src/application/use-cases/note-view";
import { SpyUseCase } from "./__spy__/spy-use-case";
import { InProcessTool } from "./in-process-tool";
import {
  EMPTY,
  MAX_CONTENT_LENGTH,
  newReplies,
  newRunner,
  NOTE,
  PATH,
  SAVED_TEXT,
  textOfLength,
  VERSION,
} from "./tool-kit";

const NAME = "edit_note";
const PASSAGE = "Ship it.";
const REPLACEMENT = "Ship it today.";
const EDIT = { path: PATH, passage: PASSAGE, replacement: REPLACEMENT };

let useCase: SpyUseCase<EditNoteInput, NoteView>;
let tool: InProcessTool;

beforeEach(async () => {
  useCase = new SpyUseCase(NOTE);
  tool = await InProcessTool.connect(new EditNoteTool(newRunner(), newReplies(), useCase), NAME);
});

describe("edit_note tool", () => {
  it("passes the passage and replacement to the use case", async () => {
    await tool.call(EDIT);

    expect(useCase.inputs).toEqual([EDIT]);
  });

  it("passes the expected version through", async () => {
    await tool.call({ ...EDIT, expectedVersion: VERSION });

    expect(useCase.inputs).toEqual([{ ...EDIT, expectedVersion: VERSION }]);
  });

  it("reports the saved path and version", async () => {
    const result = await tool.call(EDIT);

    expect(result.content).toEqual([{ type: "text", text: SAVED_TEXT }]);
  });

  it("accepts an empty replacement to delete the passage", async () => {
    await tool.call({ ...EDIT, replacement: EMPTY });

    expect(useCase.inputs).toEqual([{ ...EDIT, replacement: EMPTY }]);
  });

  it("rejects an empty passage", async () => {
    await tool.call({ ...EDIT, passage: EMPTY });

    expect(useCase.inputs).toEqual([]);
  });

  it("requires a replacement", async () => {
    const result = await tool.call({ path: PATH, passage: PASSAGE });

    expect(result.isError).toBe(true);
  });

  it("rejects a replacement that is too long", async () => {
    await tool.call({ ...EDIT, replacement: textOfLength(MAX_CONTENT_LENGTH + 1) });

    expect(useCase.inputs).toEqual([]);
  });
});
