import { McpE2eStack } from "../mcp-e2e-stack";

const STARTUP_TIMEOUT_MS = 60_000;
const PLAN = "projects/plan.md";
const PLAN_TEXT = "# Plan\n\n## Goals\n\nShip the MCP server.\n\n## Risks\n\nNone yet.\n";
const INBOX = "inbox.md";
const MISSING = "projects/missing.md";
const VERSION_LINE = /^version: \w+$/;
const SEED = { [PLAN]: PLAN_TEXT, [INBOX]: "# Inbox\n", "assets/logo.png": "PNG" };

let stack: McpE2eStack;

beforeAll(async () => {
    stack = await McpE2eStack.start();
}, STARTUP_TIMEOUT_MS);

beforeEach(() => {
    stack.seed(SEED);
});

afterAll(async () => {
    await stack.stop();
});

describe("list_notes", () => {
    it("lists every Markdown note", async () => {
        const text = await stack.client.callText("list_notes", {});

        expect(text).toEqual([`${INBOX}\n${PLAN}`]);
    });

    it("says so when a folder holds no notes", async () => {
        const text = await stack.client.callText("list_notes", { folder: "empty" });

        expect(text).toEqual(["No notes found."]);
    });

    it("rejects a folder outside the notes", async () => {
        const result = await stack.client.callTool("list_notes", { folder: "../secrets" });

        expect(result.isError).toBe(true);
    });

    it("lists only the notes under a folder", async () => {
        const text = await stack.client.callText("list_notes", { folder: "projects" });

        expect(text).toEqual([PLAN]);
    });
});

describe("read_note", () => {
    it("returns the content in the first block", async () => {
        const [content] = await stack.client.callText("read_note", { path: PLAN });

        expect(content).toBe(PLAN_TEXT);
    });

    it("returns the version in a separate block", async () => {
        const [, version] = await stack.client.callText("read_note", { path: PLAN });

        expect(version).toMatch(VERSION_LINE);
    });

    it("reports a missing note as a tool error", async () => {
        const result = await stack.client.callTool("read_note", { path: MISSING });

        expect(result).toEqual({
            isError: true,
            content: [
                {
                    type: "text",
                    text: `Note not found: "${MISSING}". Call list_notes to see the paths.`,
                },
            ],
        });
    });
});

describe("read_section", () => {
    it("returns only the section under the heading", async () => {
        const [section] = await stack.client.callText("read_section", {
            path: PLAN,
            heading: "Goals",
        });

        expect(section).toBe("## Goals\n\nShip the MCP server.");
    });

    it("reports an unknown heading as a tool error", async () => {
        const result = await stack.client.callTool("read_section", { path: PLAN, heading: "Budget" });

        expect(result.isError).toBe(true);
    });

    it("reports a missing note as a tool error", async () => {
        const result = await stack.client.callTool("read_section", { path: MISSING, heading: "Goals" });

        expect(result.isError).toBe(true);
    });
});
