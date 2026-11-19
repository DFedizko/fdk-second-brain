import { Container } from "inversify";
import { mcpModule } from "../../../../src/adapters/inbound/mcp/mcp.container";
import { MCP } from "../../../../src/adapters/inbound/mcp/mcp.symbols";
import { NotesMcpServer } from "../../../../src/adapters/inbound/mcp/notes-mcp-server";
import { CLOCK } from "../../../../src/adapters/outbound/clock/clock.symbols";
import { GITHUB } from "../../../../src/adapters/outbound/github/github.symbols";
import { useCasesModule } from "../../../../src/main/use-cases/use-cases.container";
import { InMemoryNoteRepo } from "../../../application/__fake__/in-memory-note-repo";
import { FixedClock } from "../../../application/use-cases/__stub__/fixed-clock";

const NOW = new Date("2026-11-19T10:30:00.000Z");
const TOOL_COUNT = 8;

function buildContainer(): Container {
  const container = new Container();
  container.bind(GITHUB.noteRepository).toConstantValue(new InMemoryNoteRepo());
  container.bind(CLOCK.clock).toConstantValue(new FixedClock(NOW));
  container.load(useCasesModule, mcpModule);
  return container;
}

describe("mcpModule", () => {
  it("binds one tool per note use case", () => {
    const container = buildContainer();

    const tools = container.getAll(MCP.tool);

    expect(tools).toHaveLength(TOOL_COUNT);
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
});
