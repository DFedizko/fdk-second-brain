import { WriteNoteTool } from "../../../../../src/adapters/inbound/mcp/tools/write-note-tool";
import type { NoteView } from "../../../../../src/application/use-cases/note-view";
import type { WriteNoteInput } from "../../../../../src/application/use-cases/write-note";
import { SpyUseCase } from "./__spy__/spy-use-case";
import { InProcessTool } from "./in-process-tool";
import {
  MAX_CONTENT_LENGTH,
  newReplies,
  newRunner,
  NOT_A_STRING,
  NOTE,
  PATH,
  SAVED_TEXT,
  textOfLength,
  VERSION,
} from "./tool-kit";

const NAME = "write_note";
const CONTENT = "# Plan\n";
const NOT_A_SHA = "v1";

let useCase: SpyUseCase<WriteNoteInput, NoteView>;
let tool: InProcessTool;

beforeEach(async () => {
  useCase = new SpyUseCase(NOTE);
  tool = await InProcessTool.connect(new WriteNoteTool(newRunner(), newReplies(), useCase), NAME);
});

describe("write_note tool", () => {
  it("creates when no version is given", async () => {
    await tool.call({ path: PATH, content: CONTENT });

    expect(useCase.inputs).toEqual([{ path: PATH, content: CONTENT }]);
  });

  it("passes the expected version through to replace", async () => {
    await tool.call({ path: PATH, content: CONTENT, expectedVersion: VERSION });

    expect(useCase.inputs).toEqual([{ path: PATH, content: CONTENT, expectedVersion: VERSION }]);
  });

  it("reports the saved path and version", async () => {
    const result = await tool.call({ path: PATH, content: CONTENT });

    expect(result.content).toEqual([{ type: "text", text: SAVED_TEXT }]);
  });

  it("accepts empty content", async () => {
    await tool.call({ path: PATH, content: "" });

    expect(useCase.inputs).toEqual([{ path: PATH, content: "" }]);
  });

  it("requires content", async () => {
    const result = await tool.call({ path: PATH });

    expect(result.isError).toBe(true);
  });

  it("rejects content that is not a string", async () => {
    await tool.call({ path: PATH, content: NOT_A_STRING });

    expect(useCase.inputs).toEqual([]);
  });

  it("rejects content that is too long", async () => {
    await tool.call({ path: PATH, content: textOfLength(MAX_CONTENT_LENGTH + 1) });

    expect(useCase.inputs).toEqual([]);
  });

  it("rejects a version that is not a git hash", async () => {
    await tool.call({ path: PATH, content: CONTENT, expectedVersion: NOT_A_SHA });

    expect(useCase.inputs).toEqual([]);
  });
});
