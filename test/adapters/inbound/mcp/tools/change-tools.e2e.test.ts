import type { FakeGitHubApi } from "../../../outbound/github/__fake__/fake-github-api";
import { VALID_ENV } from "../../../../main/__stub__/valid-env";
import { McpE2eStack } from "../mcp-e2e-stack";

const STARTUP_TIMEOUT_MS = 60_000;
const PLAN = "projects/plan.md";
const PLAN_TEXT = "# Plan\n";
const ARCHIVED = "archive/plan.md";
const MISSING = "projects/missing.md";
const IDEA_SAVED = /^Saved ideas\/\d{4}-\d{2}-\d{2}-offline-mode\.md\nversion: \w+$/;
const IDEA_PATH = /^ideas\/\d{4}-\d{2}-\d{2}-offline-mode\.md$/;

let stack: McpE2eStack;
let repo: FakeGitHubApi;

beforeAll(async () => {
  stack = await McpE2eStack.start();
}, STARTUP_TIMEOUT_MS);

beforeEach(() => {
  repo = stack.seed({ [PLAN]: PLAN_TEXT });
});

afterAll(async () => {
  await stack.stop();
});

function files(): Record<string, string> {
  return repo.filesOn(VALID_ENV.NOTES_BRANCH);
}

describe("delete_note", () => {
  it("deletes the note", async () => {
    await stack.client.callTool("delete_note", { path: PLAN });

    expect(files()).not.toHaveProperty(PLAN);
  });

  it("confirms the deleted path", async () => {
    const text = await stack.client.callText("delete_note", { path: PLAN });

    expect(text).toEqual([`Deleted ${PLAN}`]);
  });

  it("reports a missing note as a tool error", async () => {
    const result = await stack.client.callTool("delete_note", { path: MISSING });

    expect(result.isError).toBe(true);
  });
});

describe("move_note", () => {
  it("moves the note to its new path", async () => {
    await stack.client.callTool("move_note", { from: PLAN, to: ARCHIVED });

    expect(files()).toEqual({ [ARCHIVED]: PLAN_TEXT });
  });

  it("refuses to move onto an existing note", async () => {
    repo = stack.seed({ [PLAN]: PLAN_TEXT, [ARCHIVED]: "# Old\n" });

    const result = await stack.client.callTool("move_note", { from: PLAN, to: ARCHIVED });

    expect(result.isError).toBe(true);
  });

  it("reports a missing note as a tool error", async () => {
    const [text] = await stack.client.callText("move_note", { from: MISSING, to: ARCHIVED });

    expect(text).toStartWith(`Note not found: "${MISSING}"`);
  });
});

describe("save_idea", () => {
  it("saves the idea as a dated note in the ideas folder", async () => {
    const text = await stack.client.callText("save_idea", {
      title: "Offline mode",
      content: "Cache notes on the phone.",
    });

    expect(text).toEqual([expect.stringMatching(IDEA_SAVED)]);
  });

  it("starts the idea note with its title as a heading", async () => {
    await stack.client.callTool("save_idea", {
      title: "Offline mode",
      content: "Cache notes on the phone.",
    });

    const idea = Object.entries(files()).find(([path]) => IDEA_PATH.test(path));
    expect(idea?.[1]).toBe("# Offline mode\n\nCache notes on the phone.");
  });

  it("keeps both ideas when the same title is saved twice", async () => {
    const idea = { title: "Offline mode", content: "Cache notes on the phone." };
    await stack.client.callTool("save_idea", idea);

    await stack.client.callTool("save_idea", idea);

    const ideas = Object.keys(files()).filter((path) => path.startsWith("ideas/"));
    expect(ideas).toHaveLength(2);
  });
});
