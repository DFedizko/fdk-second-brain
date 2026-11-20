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

  it("shows each search hit with its path, heading and snippet", () => {
    const results = new ToolResults();

    const result = results.hits([
      { path: PATH, heading: "Plan", snippet: "Ship it." },
      { path: "inbox.md", heading: "Today", snippet: "Call Ana." },
    ]);

    expect(result.content).toEqual([
      { type: "text", text: `${PATH} > Plan\nShip it.` },
      { type: "text", text: "inbox.md > Today\nCall Ana." },
    ]);
  });

  it("shows only the path of a hit before the first heading", () => {
    const results = new ToolResults();

    const result = results.hits([{ path: PATH, heading: "", snippet: "Intro." }]);

    expect(result.content).toEqual([{ type: "text", text: `${PATH}\nIntro.` }]);
  });

  it("says so when no note matches the search", () => {
    const results = new ToolResults();

    const result = results.hits([]);

    expect(result.content).toEqual([{ type: "text", text: "No notes match the search." }]);
  });
});
