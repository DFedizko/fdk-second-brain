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

        expect(outline.section("Tasks").content).toBe(TASKS);
    });

    it("stops a section at a heading of a higher level", () => {
        const outline = new MarkdownOutline(NOTE);

        expect(outline.section("Later").content).toBe("### Later\n- deploy");
    });

    it("ignores headings inside fenced code blocks", () => {
        const outline = new MarkdownOutline(NOTE);

        expect(outline.section("Notes").content).toBe("## Notes\n```md\n## Not a heading\n```\nfree text");
    });

    it("runs the last section to the end of the note", () => {
        const outline = new MarkdownOutline(NOTE);

        expect(outline.section("Appendix").content).toBe("# Appendix\nend");
    });

    it("finds a heading written with its hashes", () => {
        const outline = new MarkdownOutline(NOTE);

        expect(outline.section("## Tasks").content).toBe(TASKS);
    });

    it("matches a heading regardless of case and spaces", () => {
        const outline = new MarkdownOutline(NOTE);

        expect(outline.section("  tasks ").content).toBe(TASKS);
    });

    it("returns the first section when a heading repeats", () => {
        const outline = new MarkdownOutline("## Log\nfirst\n## Log\nsecond");

        expect(outline.section("Log").content).toBe("## Log\nfirst");
    });

    it("drops trailing blank lines", () => {
        const outline = new MarkdownOutline("## Log\nfirst\n\n\n## Next\n");

        expect(outline.section("Log").content).toBe("## Log\nfirst");
    });

    it("reads notes saved with Windows line endings", () => {
        const outline = new MarkdownOutline("## Log\r\nfirst\r\n## Next\r\n");

        expect(outline.section("Log").content).toBe("## Log\nfirst");
    });

    it("closes a fence only with the same marker that opened it", () => {
        const outline = new MarkdownOutline("## A\n~~~\n```\n~~~\n## B\nx");

        expect(outline.section("A").content).toBe("## A\n~~~\n```\n~~~");
    });

    it("does not open a fence on a backtick line whose info string has a backtick", () => {
        const outline = new MarkdownOutline("## A\n```js inline``` here\n## B\nx");

        expect(outline.section("A").content).toBe("## A\n```js inline``` here");
    });

    it("returns the heading as the note writes it", () => {
        const outline = new MarkdownOutline(NOTE);

        expect(outline.section("  tasks ").heading).toBe("Tasks");
    });

    it("keeps a shorter fence inside a longer one", () => {
        const outline = new MarkdownOutline("## A\n````md\n```\n## Fake\n```\n````\nafter\n## B\nx");

        expect(outline.section("A").content).toBe("## A\n````md\n```\n## Fake\n```\n````\nafter");
    });

    it("does not close a fence on a line with an info string", () => {
        const outline = new MarkdownOutline("## A\n```\n```js\n## Fake\n```\nafter");

        expect(() => outline.section("Fake")).toThrow(SectionNotFound);
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

describe("MarkdownOutline.parts", () => {
    it("splits the note at every heading, with the text before the first one", () => {
        const outline = new MarkdownOutline("lead\n# A\none\n## B\ntwo\n\n");

        expect(outline.parts()).toEqual([
            { heading: "", body: "lead" },
            { heading: "A", body: "one" },
            { heading: "B", body: "two" },
        ]);
    });

    it("keeps fenced headings inside the body", () => {
        const outline = new MarkdownOutline("# A\n```\n# B\n```");

        expect(outline.parts()).toEqual([{ heading: "A", body: "```\n# B\n```" }]);
    });
});
