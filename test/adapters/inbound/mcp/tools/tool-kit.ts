import type { NoteView } from "../../../../../src/application/use-cases/note-view";
import { ToolErrorMapper } from "../../../../../src/adapters/inbound/mcp/tool-error-mapper";
import { ToolResults } from "../../../../../src/adapters/inbound/mcp/tool-results";
import { ToolRunner } from "../../../../../src/adapters/inbound/mcp/tool-runner";
import { SpyErrorLog } from "../__spy__/spy-error-log";

export const MAX_PATH_LENGTH = 1024;
export const MAX_LABEL_LENGTH = 200;
export const MAX_CONTENT_LENGTH = 1_000_000;
export const PATH = "projects/plan.md";
export const OTHER_PATH = "archive/plan.md";
export const VERSION = "3f2a9c1e5b7d4a6f8e0c2b4d6f8a0c2e4b6d8f0a";
export const NOTE: NoteView = { path: PATH, content: "# Plan\n\nShip it.\n", version: VERSION };
export const SAVED_TEXT = `Saved ${PATH}\nversion: ${VERSION}`;
export const NOT_A_STRING = 42;
export const EMPTY = "";

export function textOfLength(length: number): string {
  return "a".repeat(length);
}

export function newRunner(): ToolRunner {
  return new ToolRunner(new ToolErrorMapper(), new SpyErrorLog());
}

export function newReplies(): ToolResults {
  return new ToolResults();
}
