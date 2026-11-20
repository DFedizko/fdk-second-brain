import { MoveNoteTool } from "../../../../../src/adapters/inbound/mcp/tools/move-note-tool";
import type { MoveNoteInput } from "../../../../../src/application/use-cases/move-note";
import type { NoteView } from "../../../../../src/application/use-cases/note-view";
import { SpyUseCase } from "./__spy__/spy-use-case";
import { InProcessTool } from "./in-process-tool";
import {
    EMPTY,
    MAX_PATH_LENGTH,
    newReplies,
    newRunner,
    NOTE,
    OTHER_PATH,
    PATH,
    SAVED_TEXT,
    textOfLength,
} from "./tool-kit";

const NAME = "move_note";

let useCase: SpyUseCase<MoveNoteInput, NoteView>;
let tool: InProcessTool;

beforeEach(async () => {
    useCase = new SpyUseCase(NOTE);
    tool = await InProcessTool.connect(new MoveNoteTool(newRunner(), newReplies(), useCase), NAME);
});

describe("move_note tool", () => {
    it("passes both paths to the use case", async () => {
        await tool.call({ from: OTHER_PATH, to: PATH });

        expect(useCase.inputs).toEqual([{ from: OTHER_PATH, to: PATH }]);
    });

    it("reports the new path and version", async () => {
        const result = await tool.call({ from: OTHER_PATH, to: PATH });

        expect(result.content).toEqual([{ type: "text", text: SAVED_TEXT }]);
    });

    it("requires a destination", async () => {
        const result = await tool.call({ from: OTHER_PATH });

        expect(result.isError).toBe(true);
    });

    it("rejects an empty destination", async () => {
        await tool.call({ from: OTHER_PATH, to: EMPTY });

        expect(useCase.inputs).toEqual([]);
    });

    it("rejects a destination that is too long", async () => {
        await tool.call({ from: OTHER_PATH, to: textOfLength(MAX_PATH_LENGTH + 1) });

        expect(useCase.inputs).toEqual([]);
    });
});
