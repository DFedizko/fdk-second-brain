import { Container } from "inversify";
import { ConsoleErrorLog } from "../../../../src/adapters/inbound/mcp/console-error-log";
import { createMcpModule } from "../../../../src/adapters/inbound/mcp/mcp.container";
import { MCP } from "../../../../src/adapters/inbound/mcp/mcp.symbols";
import { NotesMcpServer } from "../../../../src/adapters/inbound/mcp/notes-mcp-server";
import { BACKGROUND } from "../../../../src/adapters/outbound/background/background.symbols";
import { CLOCK } from "../../../../src/adapters/outbound/clock/clock.symbols";
import { GITHUB } from "../../../../src/adapters/outbound/github/github.symbols";
import { SearchNotes } from "../../../../src/application/use-cases/search-notes";
import { SEARCH } from "../../../../src/main/search/search.symbols";
import { useCasesModule } from "../../../../src/main/use-cases/use-cases.container";
import { USE_CASES } from "../../../../src/main/use-cases/use-cases.symbols";
import { InMemoryNoteRepo } from "../../../application/__fake__/in-memory-note-repo";
import { InMemorySearchIndex } from "../../../application/use-cases/__fake__/in-memory-search-index";
import { ManualBackgroundTasks } from "../../../application/use-cases/__fake__/manual-background-tasks";
import { SpyIndexSync } from "../../../application/use-cases/__spy__/spy-index-sync";
import { FixedClock } from "../../../__stub__/fixed-clock";
import { SpyErrorLog } from "./__spy__/spy-error-log";

const NOW = new Date("2026-11-19T10:30:00.000Z");
const TOOL_COUNT = 9;
const MCP_URL = "https://second-brain.example/mcp";
const WRONG_MEDIA_TYPE = new Request(MCP_URL, {
    method: "POST",
    headers: { accept: "application/json, text/event-stream", "content-type": "text/plain" },
    body: "list my notes",
});

function buildContainer(): Container {
    const container = new Container();
    container.bind(GITHUB.noteRepository).toConstantValue(new InMemoryNoteRepo());
    container.bind(CLOCK.clock).toConstantValue(new FixedClock(NOW));
    container.bind(SEARCH.indexSync).toConstantValue(new SpyIndexSync());
    container.bind(BACKGROUND.tasks).toConstantValue(new ManualBackgroundTasks());
    container.bind(SEARCH.searchNotes).toConstantValue(new SearchNotes(new InMemorySearchIndex()));
    container.load(useCasesModule, createMcpModule({ ...USE_CASES, searchNotes: SEARCH.searchNotes }));
    return container;
}

describe("mcpModule", () => {
    it("binds one tool per note use case and search", () => {
        const container = buildContainer();

        const tools = container.getAll(MCP.tool);

        expect(tools).toHaveLength(TOOL_COUNT);
    });

    it("reports unexpected tool errors to the Worker's logs", () => {
        const container = buildContainer();

        const log = container.get(MCP.errorLog);

        expect(log).toBeInstanceOf(ConsoleErrorLog);
    });

    it("binds the notes MCP server factory", () => {
        const container = buildContainer();

        const server = container.get(MCP.server);

        expect(server).toBeInstanceOf(NotesMcpServer);
    });

    it("binds one HTTP handler for the whole container", () => {
        const container = buildContainer();

        const handler = container.get(MCP.httpHandler);

        expect(handler).toBe(container.get(MCP.httpHandler));
    });

    it("reports requests the MCP protocol layer rejects", async () => {
        const container = buildContainer();
        const log = new SpyErrorLog();
        container.rebind(MCP.errorLog).toConstantValue(log);

        await container.get(MCP.httpHandler).fetch(WRONG_MEDIA_TYPE);

        expect(log.reported).not.toEqual([]);
    });
});
