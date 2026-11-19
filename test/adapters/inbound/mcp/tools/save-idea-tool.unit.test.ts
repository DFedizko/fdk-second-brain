import { SaveIdeaTool } from "../../../../../src/adapters/inbound/mcp/tools/save-idea-tool";
import type { NoteView } from "../../../../../src/application/use-cases/note-view";
import type { SaveIdeaInput } from "../../../../../src/application/use-cases/save-idea";
import { SpyUseCase } from "./__spy__/spy-use-case";
import { InProcessTool } from "./in-process-tool";
import {
  EMPTY,
  MAX_CONTENT_LENGTH,
  MAX_LABEL_LENGTH,
  newReplies,
  newRunner,
  NOTE,
  SAVED_TEXT,
  textOfLength,
} from "./tool-kit";

const NAME = "save_idea";
const IDEA = { title: "Offline mode", content: "Cache notes on the phone." };

let useCase: SpyUseCase<SaveIdeaInput, NoteView>;
let tool: InProcessTool;

beforeEach(async () => {
  useCase = new SpyUseCase(NOTE);
  tool = await InProcessTool.connect(new SaveIdeaTool(newRunner(), newReplies(), useCase), NAME);
});

describe("save_idea tool", () => {
  it("passes the title and content to the use case", async () => {
    await tool.call(IDEA);

    expect(useCase.inputs).toEqual([IDEA]);
  });

  it("reports the saved path and version", async () => {
    const result = await tool.call(IDEA);

    expect(result.content).toEqual([{ type: "text", text: SAVED_TEXT }]);
  });

  it("rejects an empty title", async () => {
    await tool.call({ ...IDEA, title: EMPTY });

    expect(useCase.inputs).toEqual([]);
  });

  it("rejects a title that is too long", async () => {
    await tool.call({ ...IDEA, title: textOfLength(MAX_LABEL_LENGTH + 1) });

    expect(useCase.inputs).toEqual([]);
  });

  it("rejects content that is too long", async () => {
    await tool.call({ ...IDEA, content: textOfLength(MAX_CONTENT_LENGTH + 1) });

    expect(useCase.inputs).toEqual([]);
  });

  it("requires content", async () => {
    const result = await tool.call({ title: IDEA.title });

    expect(result.isError).toBe(true);
  });
});
