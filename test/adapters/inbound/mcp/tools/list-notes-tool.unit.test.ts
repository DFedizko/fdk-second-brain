import { ListNotesTool } from "../../../../../src/adapters/inbound/mcp/tools/list-notes-tool";
import type { ListNotesInput } from "../../../../../src/application/use-cases/list-notes";
import { SpyUseCase } from "./__spy__/spy-use-case";
import { InProcessTool } from "./in-process-tool";
import {
  MAX_PATH_LENGTH,
  newReplies,
  newRunner,
  NOT_A_STRING,
  OTHER_PATH,
  PATH,
  textOfLength,
} from "./tool-kit";

const NAME = "list_notes";

let useCase: SpyUseCase<ListNotesInput, string[]>;
let tool: InProcessTool;

beforeEach(async () => {
  useCase = new SpyUseCase([OTHER_PATH, PATH]);
  tool = await InProcessTool.connect(new ListNotesTool(newRunner(), newReplies(), useCase), NAME);
});

describe("list_notes tool", () => {
  it("passes the folder to the use case", async () => {
    await tool.call({ folder: "projects" });

    expect(useCase.inputs).toEqual([{ folder: "projects" }]);
  });

  it("lists every note when no folder is given", async () => {
    await tool.call({});

    expect(useCase.inputs).toEqual([{}]);
  });

  it("formats the paths one per line", async () => {
    const result = await tool.call({});

    expect(result.content).toEqual([{ type: "text", text: `${OTHER_PATH}\n${PATH}` }]);
  });

  it("rejects a folder that is not a string", async () => {
    const result = await tool.call({ folder: NOT_A_STRING });

    expect(result.isError).toBe(true);
  });

  it("rejects a folder longer than a path may be", async () => {
    await tool.call({ folder: textOfLength(MAX_PATH_LENGTH + 1) });

    expect(useCase.inputs).toEqual([]);
  });

  it("declares folder as optional", async () => {
    const definition = await tool.definition();

    expect(definition?.inputSchema.required ?? []).not.toContain("folder");
  });
});
