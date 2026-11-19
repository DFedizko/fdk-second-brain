import { ReadNoteTool } from "../../../../../src/adapters/inbound/mcp/tools/read-note-tool";
import type { NoteView } from "../../../../../src/application/use-cases/note-view";
import type { ReadNoteInput } from "../../../../../src/application/use-cases/read-note";
import { SpyUseCase } from "./__spy__/spy-use-case";
import { InProcessTool } from "./in-process-tool";
import {
  EMPTY,
  MAX_PATH_LENGTH,
  newReplies,
  newRunner,
  NOTE,
  PATH,
  textOfLength,
  VERSION,
} from "./tool-kit";

const NAME = "read_note";

let useCase: SpyUseCase<ReadNoteInput, NoteView>;
let tool: InProcessTool;

beforeEach(async () => {
  useCase = new SpyUseCase(NOTE);
  tool = await InProcessTool.connect(new ReadNoteTool(newRunner(), newReplies(), useCase), NAME);
});

describe("read_note tool", () => {
  it("passes the path to the use case", async () => {
    await tool.call({ path: PATH });

    expect(useCase.inputs).toEqual([{ path: PATH }]);
  });

  it("returns the content, then the version in its own block", async () => {
    const result = await tool.call({ path: PATH });

    expect(result.content).toEqual([
      { type: "text", text: NOTE.content },
      { type: "text", text: `version: ${VERSION}` },
    ]);
  });

  it("requires a path", async () => {
    const result = await tool.call({});

    expect(result.isError).toBe(true);
  });

  it("rejects an empty path", async () => {
    await tool.call({ path: EMPTY });

    expect(useCase.inputs).toEqual([]);
  });

  it("rejects a path that is too long", async () => {
    await tool.call({ path: textOfLength(MAX_PATH_LENGTH + 1) });

    expect(useCase.inputs).toEqual([]);
  });

  it("accepts a path of the maximum length", async () => {
    const path = textOfLength(MAX_PATH_LENGTH);

    await tool.call({ path });

    expect(useCase.inputs).toEqual([{ path }]);
  });
});
