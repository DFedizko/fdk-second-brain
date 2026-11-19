import { MarkdownOutline } from "../../src/domain/markdown-outline";
import { SectionNotFound } from "../../src/domain/errors/section-not-found";

const NOTE = [
  "# Project",
  "intro",
  "## Tasks",
  "- write tests",
  "### Later",
  "- deploy",
  "## Notes",
  "```md",
  "## Not a heading",
  "```",
  "free text",
  "# Appendix",
  "end",
].join("\n");

const TASKS = ["## Tasks", "- write tests", "### Later", "- deploy"].join("\n");

describe("MarkdownOutline", () => {
  it("returns a section with its nested subsections", () => {
    const outline = new MarkdownOutline(NOTE);

    expect(outline.section("Tasks")).toBe(TASKS);
  });

  it("stops a section at a heading of a higher level", () => {
    const outline = new MarkdownOutline(NOTE);

    expect(outline.section("Later")).toBe("### Later\n- deploy");
  });

  it("ignores headings inside fenced code blocks", () => {
    const outline = new MarkdownOutline(NOTE);

    expect(outline.section("Notes")).toBe("## Notes\n```md\n## Not a heading\n```\nfree text");
  });

  it("runs the last section to the end of the note", () => {
    const outline = new MarkdownOutline(NOTE);

    expect(outline.section("Appendix")).toBe("# Appendix\nend");
  });

  it("finds a heading written with its hashes", () => {
    const outline = new MarkdownOutline(NOTE);

    expect(outline.section("## Tasks")).toBe(TASKS);
  });

  it("matches a heading regardless of case and spaces", () => {
    const outline = new MarkdownOutline(NOTE);

    expect(outline.section("  tasks ")).toBe(TASKS);
  });

  it("returns the first section when a heading repeats", () => {
    const outline = new MarkdownOutline("## Log\nfirst\n## Log\nsecond");

    expect(outline.section("Log")).toBe("## Log\nfirst");
  });

  it("drops trailing blank lines", () => {
    const outline = new MarkdownOutline("## Log\nfirst\n\n\n## Next\n");

    expect(outline.section("Log")).toBe("## Log\nfirst");
  });

  it("reads notes saved with Windows line endings", () => {
    const outline = new MarkdownOutline("## Log\r\nfirst\r\n## Next\r\n");

    expect(outline.section("Log")).toBe("## Log\nfirst");
  });

  it("rejects a heading that does not exist", () => {
    const outline = new MarkdownOutline(NOTE);

    expect(() => outline.section("Budget")).toThrow(SectionNotFound);
  });

  it("does not take fenced text for a heading", () => {
    const outline = new MarkdownOutline(NOTE);

    expect(() => outline.section("Not a heading")).toThrow(SectionNotFound);
  });
});
