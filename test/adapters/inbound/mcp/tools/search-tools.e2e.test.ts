import { McpE2eStack } from "../mcp-e2e-stack";
import { SettledSearch } from "./settled-search";

const STARTUP_TIMEOUT_MS = 60_000;
const PLAN = "projects/plan.md";
const ARCHIVED = "archive/plan.md";
const NO_MATCHES = "No notes match the search.";
const IDEA_HIT = /^ideas\/[\w-]+-offline\.md > Offline\n/;

let stack: McpE2eStack;
let search: SettledSearch;

beforeAll(async () => {
  stack = await McpE2eStack.start();
  search = new SettledSearch(stack.client);
}, STARTUP_TIMEOUT_MS);

beforeEach(() => {
  stack.seed({});
});

afterAll(async () => {
  await stack.stop();
});

function planAbout(word: string): string {
  return `# Plan\n\nShip the ${word} release.\n`;
}

function hitAt(path: string, word: string): string {
  return `${path} > Plan\nShip the ${word} release.`;
}

const showsOnly = (hit: string) => (hits: readonly string[]) =>
  hits.length === 1 && hits[0] === hit;

async function writeIndexedPlan(word: string): Promise<void> {
  await stack.client.callTool("write_note", { path: PLAN, content: planAbout(word) });
  await search.until(word, showsOnly(hitAt(PLAN, word)));
}

describe("search_notes", () => {
  it("finds a note saved with write_note", async () => {
    await stack.client.callTool("write_note", { path: PLAN, content: planAbout("aurora") });

    const hits = await search.until("aurora", showsOnly(hitAt(PLAN, "aurora")));

    expect(hits).toEqual([hitAt(PLAN, "aurora")]);
  });

  it("finds an idea saved with save_idea", async () => {
    await stack.client.callTool("save_idea", { title: "Offline", content: "Cache the borealis." });

    const hits = await search.until("borealis", (found) => IDEA_HIT.test(found[0] ?? ""));

    expect(hits).toEqual([expect.stringMatching(IDEA_HIT)]);
  });

  it("finds the new words of an edited note", async () => {
    await writeIndexedPlan("cirrus");
    await stack.client.callTool("edit_note", {
      path: PLAN,
      passage: "cirrus",
      replacement: "cumulus",
    });

    const hits = await search.until("cumulus", showsOnly(hitAt(PLAN, "cumulus")));

    expect(hits).toEqual([hitAt(PLAN, "cumulus")]);
  });

  it("shows the new path of a moved note", async () => {
    await writeIndexedPlan("dorado");
    await stack.client.callTool("move_note", { from: PLAN, to: ARCHIVED });

    const hits = await search.until("dorado", showsOnly(hitAt(ARCHIVED, "dorado")));

    expect(hits).toEqual([hitAt(ARCHIVED, "dorado")]);
  });

  it("no longer finds a deleted note", async () => {
    await writeIndexedPlan("eridanus");
    await stack.client.callTool("delete_note", { path: PLAN });

    const hits = await search.until("eridanus", showsOnly(NO_MATCHES));

    expect(hits).toEqual([NO_MATCHES]);
  });

  it("explains a query with no words to look for", async () => {
    const [text] = await stack.client.callText("search_notes", { query: "?!" });

    expect(text).toBe('The search "?!" has no words to look for');
  });
});
