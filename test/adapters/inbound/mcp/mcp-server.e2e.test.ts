import { McpE2eStack } from "./mcp-e2e-stack";

const STARTUP_TIMEOUT_MS = 60_000;
const SERVER_NAME = "second-brain";
const TOOL_NAMES = [
  "delete_note",
  "edit_note",
  "list_notes",
  "move_note",
  "read_note",
  "read_section",
  "save_idea",
  "write_note",
];
const NOT_FOUND = 404;

let stack: McpE2eStack;

beforeAll(async () => {
  stack = await McpE2eStack.start();
}, STARTUP_TIMEOUT_MS);

afterAll(async () => {
  await stack.stop();
});

describe("MCP server over streamable HTTP", () => {
  it("completes the initialize handshake", async () => {
    const result = await stack.client.initialize();

    expect(result.serverInfo.name).toBe(SERVER_NAME);
  });

  it("offers the tools capability", async () => {
    const result = await stack.client.initialize();

    expect(result.capabilities.tools).toBeDefined();
  });

  it("lists every note tool", async () => {
    const result = await stack.client.listTools();

    expect(result.tools.map((tool) => tool.name).sort()).toEqual(TOOL_NAMES);
  });

  it("describes every tool with an input schema", async () => {
    const result = await stack.client.listTools();

    expect(result.tools.every((tool) => tool.inputSchema.type === "object")).toBe(true);
  });

  it("answers not found outside the MCP path", async () => {
    const response = await stack.fetchPath("/elsewhere");

    expect(response.status).toBe(NOT_FOUND);
  });
});
