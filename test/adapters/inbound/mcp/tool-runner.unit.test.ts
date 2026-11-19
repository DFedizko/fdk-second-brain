import type { CallToolResult } from "@modelcontextprotocol/server";
import { ToolErrorMapper } from "../../../../src/adapters/inbound/mcp/tool-error-mapper";
import { ToolRunner } from "../../../../src/adapters/inbound/mcp/tool-runner";
import { NoteNotFound } from "../../../../src/domain/errors/note-not-found";

const PATH = "missing.md";
const DONE: CallToolResult = { content: [{ type: "text", text: "done" }] };

describe("ToolRunner", () => {
  it("returns the result of a call that succeeds", async () => {
    const runner = new ToolRunner(new ToolErrorMapper());

    const result = await runner.run(async () => DONE);

    expect(result).toBe(DONE);
  });

  it("turns a failure into a tool error result", async () => {
    const runner = new ToolRunner(new ToolErrorMapper());
    const failure = new NoteNotFound(PATH);

    const result = await runner.run(async () => Promise.reject(failure));

    expect(result).toEqual(new ToolErrorMapper().toResult(failure));
  });
});
