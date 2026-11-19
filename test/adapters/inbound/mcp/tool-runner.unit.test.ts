import type { CallToolResult } from "@modelcontextprotocol/server";
import { ToolErrorMapper } from "../../../../src/adapters/inbound/mcp/tool-error-mapper";
import { ToolRunner } from "../../../../src/adapters/inbound/mcp/tool-runner";
import { NoteNotFound } from "../../../../src/domain/errors/note-not-found";
import { NotesAccessDenied } from "../../../../src/domain/errors/notes-access-denied";
import { NotesRateLimited } from "../../../../src/domain/errors/notes-rate-limited";
import { NotesUnavailable } from "../../../../src/domain/errors/notes-unavailable";
import { SpyErrorLog } from "./__spy__/spy-error-log";

const PATH = "missing.md";
const DONE: CallToolResult = { content: [{ type: "text", text: "done" }] };

describe("ToolRunner", () => {
  it("returns the result of a call that succeeds", async () => {
    const runner = new ToolRunner(new ToolErrorMapper(), new SpyErrorLog());

    const result = await runner.run(async () => DONE);

    expect(result).toBe(DONE);
  });

  it("turns a failure into a tool error result", async () => {
    const runner = new ToolRunner(new ToolErrorMapper(), new SpyErrorLog());
    const failure = new NoteNotFound(PATH);

    const result = await runner.run(async () => Promise.reject(failure));

    expect(result).toEqual(new ToolErrorMapper().toResult(failure));
  });

  it("reports an unexpected error so it can be debugged", async () => {
    const log = new SpyErrorLog();
    const runner = new ToolRunner(new ToolErrorMapper(), log);
    const bug = new TypeError("cannot read properties of undefined");

    await runner.run(async () => Promise.reject(bug));

    expect(log.reported).toEqual([bug]);
  });

  it("does not report an expected domain error", async () => {
    const log = new SpyErrorLog();
    const runner = new ToolRunner(new ToolErrorMapper(), log);

    await runner.run(async () => Promise.reject(new NoteNotFound(PATH)));

    expect(log.reported).toEqual([]);
  });

  it.each([new NotesUnavailable(), new NotesAccessDenied(), new NotesRateLimited()])(
    "reports $name so the operator can see it",
    async (failure) => {
      const log = new SpyErrorLog();
      const runner = new ToolRunner(new ToolErrorMapper(), log);

      await runner.run(async () => Promise.reject(failure));

      expect(log.reported).toEqual([failure]);
    },
  );
});
