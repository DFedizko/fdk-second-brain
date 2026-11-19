import { ToolResults } from "../../../../src/adapters/inbound/mcp/tool-results";

const PATH = "projects/plan.md";
const CONTENT = "# Plan\n\nShip it.";
const VERSION = "3f2a9c";
const NOTE = { path: PATH, content: CONTENT, version: VERSION };

describe("ToolResults", () => {
  it("lists note paths one per line", () => {
    const results = new ToolResults();

    const result = results.paths([PATH, "inbox.md"]);

    expect(result.content).toEqual([{ type: "text", text: `${PATH}\ninbox.md` }]);
  });

  it("says so when there are no notes", () => {
    const results = new ToolResults();

    const result = results.paths([]);

    expect(result.content).toEqual([{ type: "text", text: "No notes found." }]);
  });

  it("returns a note's content and its version in separate blocks", () => {
    const results = new ToolResults();

    const result = results.note(NOTE);

    expect(result.content).toEqual([
      { type: "text", text: CONTENT },
      { type: "text", text: `version: ${VERSION}` },
    ]);
  });

  it("reports a saved note by its path and new version", () => {
    const results = new ToolResults();

    const result = results.saved(NOTE);

    expect(result.content).toEqual([{ type: "text", text: `Saved ${PATH}\nversion: ${VERSION}` }]);
  });

  it("reports a deleted note by its path", () => {
    const results = new ToolResults();

    const result = results.deleted(PATH);

    expect(result.content).toEqual([{ type: "text", text: `Deleted ${PATH}` }]);
  });
});
