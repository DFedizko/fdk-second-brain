import type { FakeGitHubApi } from "../../../outbound/github/__fake__/fake-github-api";
import { VALID_ENV } from "../../../../main/__stub__/valid-env";
import { McpE2eStack } from "../mcp-e2e-stack";
import { readVersion } from "./e2e-notes";

const STARTUP_TIMEOUT_MS = 60_000;
const PLAN = "projects/plan.md";
const PLAN_TEXT = "# Plan\n\nShip the MCP server.\n";
const NEW_NOTE = "journal/today.md";
const STALE_VERSION = "0000000000000000000000000000000000000000";
const SAVED_LINE = /^Saved journal\/today\.md\nversion: \w+$/;

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

function fileOf(path: string): string | undefined {
  return repo.filesOn(VALID_ENV.NOTES_BRANCH)[path];
}

describe("write_note", () => {
  it("creates a new note", async () => {
    await stack.client.callTool("write_note", { path: NEW_NOTE, content: "# Today\n" });

    expect(fileOf(NEW_NOTE)).toBe("# Today\n");
  });

  it("reports the saved path and its new version", async () => {
    const text = await stack.client.callText("write_note", { path: NEW_NOTE, content: "# Day\n" });

    expect(text).toEqual([expect.stringMatching(SAVED_LINE)]);
  });

  it("replaces a note given its current version", async () => {
    const version = await readVersion(stack.client, PLAN);

    await stack.client.callTool("write_note", {
      path: PLAN,
      content: "# New plan\n",
      expectedVersion: version,
    });

    expect(fileOf(PLAN)).toBe("# New plan\n");
  });

  it("refuses to create over an existing note", async () => {
    const result = await stack.client.callTool("write_note", { path: PLAN, content: "x" });

    expect(result.content).toEqual([
      {
        type: "text",
        text: `Note already exists: "${PLAN}". Use a free path, or replace it with write_note and the expectedVersion from read_note.`,
      },
    ]);
  });

  it("reports a stale version as a conflict and keeps the note", async () => {
    await stack.client.callTool("write_note", {
      path: PLAN,
      content: "# Lost update\n",
      expectedVersion: STALE_VERSION,
    });

    expect(fileOf(PLAN)).toBe(PLAN_TEXT);
  });

  it("explains how to recover from a conflict", async () => {
    const [text] = await stack.client.callText("write_note", {
      path: PLAN,
      content: "# Lost update\n",
      expectedVersion: STALE_VERSION,
    });

    expect(text).toEndWith("Read the note again and retry with its current version.");
  });

  it("rejects input that breaks the schema", async () => {
    const result = await stack.client.callTool("write_note", { path: PLAN });

    expect(result.isError).toBe(true);
  });
});

describe("edit_note", () => {
  it("replaces one passage", async () => {
    await stack.client.callTool("edit_note", {
      path: PLAN,
      passage: "Ship the MCP server.",
      replacement: "Ship it today.",
    });

    expect(fileOf(PLAN)).toBe("# Plan\n\nShip it today.\n");
  });

  it("reports a stale version as a conflict", async () => {
    const [text] = await stack.client.callText("edit_note", {
      path: PLAN,
      passage: "Ship",
      replacement: "Drop",
      expectedVersion: STALE_VERSION,
    });

    expect(text).toStartWith(`Note "${PLAN}" changed`);
  });

  it("reports a missing note as a tool error", async () => {
    const result = await stack.client.callTool("edit_note", {
      path: NEW_NOTE,
      passage: "a",
      replacement: "b",
    });

    expect(result.isError).toBe(true);
  });
});
