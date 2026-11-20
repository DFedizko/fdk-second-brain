import { DeleteNoteTool } from "../../../../../src/adapters/inbound/mcp/tools/delete-note-tool";
import type { DeleteNoteInput } from "../../../../../src/application/use-cases/delete-note";
import { SpyUseCase } from "./__spy__/spy-use-case";
import { InProcessTool } from "./in-process-tool";
import { EMPTY, newReplies, newRunner, PATH } from "./tool-kit";

const NAME = "delete_note";

let useCase: SpyUseCase<DeleteNoteInput, void>;
let tool: InProcessTool;

beforeEach(async () => {
    useCase = new SpyUseCase(undefined);
    tool = await InProcessTool.connect(new DeleteNoteTool(newRunner(), newReplies(), useCase), NAME);
});

describe("delete_note tool", () => {
    it("passes the path to the use case", async () => {
        await tool.call({ path: PATH });

        expect(useCase.inputs).toEqual([{ path: PATH }]);
    });

    it("confirms the deleted path", async () => {
        const result = await tool.call({ path: PATH });

        expect(result.content).toEqual([{ type: "text", text: `Deleted ${PATH}` }]);
    });

    it("requires a path", async () => {
        const result = await tool.call({});

        expect(result.isError).toBe(true);
    });

    it("rejects an empty path", async () => {
        await tool.call({ path: EMPTY });

        expect(useCase.inputs).toEqual([]);
    });

    it("is marked destructive", async () => {
        const definition = await tool.definition();

        expect(definition?.annotations?.destructiveHint).toBe(true);
    });
});
