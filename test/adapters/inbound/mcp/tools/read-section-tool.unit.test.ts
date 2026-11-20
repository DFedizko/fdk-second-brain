import { ReadSectionTool } from "../../../../../src/adapters/inbound/mcp/tools/read-section-tool";
import type { ReadSectionInput, SectionView } from "../../../../../src/application/use-cases/read-section";
import { SpyUseCase } from "./__spy__/spy-use-case";
import { InProcessTool } from "./in-process-tool";
import { EMPTY, MAX_LABEL_LENGTH, newReplies, newRunner, PATH, textOfLength, VERSION } from "./tool-kit";

const NAME = "read_section";
const HEADING = "Goals";
const SECTION: SectionView = {
    path: PATH,
    heading: HEADING,
    content: "## Goals\n\nShip it.",
    version: VERSION,
};

let useCase: SpyUseCase<ReadSectionInput, SectionView>;
let tool: InProcessTool;

beforeEach(async () => {
    useCase = new SpyUseCase(SECTION);
    const readSection = new ReadSectionTool(newRunner(), newReplies(), useCase);
    tool = await InProcessTool.connect(readSection, NAME);
});

describe("read_section tool", () => {
    it("passes the path and heading to the use case", async () => {
        await tool.call({ path: PATH, heading: HEADING });

        expect(useCase.inputs).toEqual([{ path: PATH, heading: HEADING }]);
    });

    it("returns the section, then the note version in its own block", async () => {
        const result = await tool.call({ path: PATH, heading: HEADING });

        expect(result.content).toEqual([
            { type: "text", text: SECTION.content },
            { type: "text", text: `version: ${VERSION}` },
        ]);
    });

    it("requires a heading", async () => {
        const result = await tool.call({ path: PATH });

        expect(result.isError).toBe(true);
    });

    it("rejects an empty heading", async () => {
        await tool.call({ path: PATH, heading: EMPTY });

        expect(useCase.inputs).toEqual([]);
    });

    it("rejects a heading that is too long", async () => {
        await tool.call({ path: PATH, heading: textOfLength(MAX_LABEL_LENGTH + 1) });

        expect(useCase.inputs).toEqual([]);
    });
});
