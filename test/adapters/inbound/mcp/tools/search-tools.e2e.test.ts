import { McpE2eStack } from "../mcp-e2e-stack";

const STARTUP_TIMEOUT_MS = 60_000;
const PLAN = "projects/plan.md";
const ARCHIVED = "archive/plan.md";
const NO_MATCHES = "No notes match the search.";

let stack: McpE2eStack;

beforeAll(async () => {
  stack = await McpE2eStack.start();
}, STARTUP_TIMEOUT_MS);

beforeEach(() => {
  stack.seed({});
});

afterAll(async () => {
  await stack.stop();
});

function search(query: string): Promise<string[]> {
  return stack.client.callText("search_notes", { query });
}

function planAbout(word: string): string {
  return `# Plan\n\nShip the ${word} release.\n`;
}

describe("search_notes", () => {
  it("finds a note saved with write_note", async () => {
    await stack.client.callTool("write_note", { path: PLAN, content: planAbout("aurora") });

    const hits = await search("aurora");

    expect(hits).toEqual([`${PLAN} > Plan\nShip the aurora release.`]);
  });

  it("finds an idea saved with save_idea", async () => {
    await stack.client.callTool("save_idea", { title: "Offline", content: "Cache the borealis." });

    const hits = await search("borealis");

    expect(hits).toEqual([expect.stringMatching(/^ideas\/[\w-]+-offline\.md > Offline\n/)]);
  });

  it("finds the new words of an edited note", async () => {
    await stack.client.callTool("write_note", { path: PLAN, content: planAbout("cirrus") });
    await stack.client.callTool("edit_note", {
      path: PLAN,
      passage: "cirrus",
      replacement: "cumulus",
    });

    const hits = await search("cumulus");

    expect(hits).toEqual([`${PLAN} > Plan\nShip the cumulus release.`]);
  });

  it("shows the new path of a moved note", async () => {
    await stack.client.callTool("write_note", { path: PLAN, content: planAbout("dorado") });
    await stack.client.callTool("move_note", { from: PLAN, to: ARCHIVED });

    const hits = await search("dorado");

    expect(hits).toEqual([`${ARCHIVED} > Plan\nShip the dorado release.`]);
  });

  it("no longer finds a deleted note", async () => {
    await stack.client.callTool("write_note", { path: PLAN, content: planAbout("eridanus") });
    await stack.client.callTool("delete_note", { path: PLAN });

    const hits = await search("eridanus");

    expect(hits).toEqual([NO_MATCHES]);
  });

  it("explains a query with no words to look for", async () => {
    const [text] = await search("?!");

    expect(text).toBe('The search "?!" has no words to look for');
  });
});
