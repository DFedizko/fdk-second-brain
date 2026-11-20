import { MarkdownChunker, MAX_CHUNK_CHARS } from "../../src/domain/markdown-chunker";

const NOTE = ["intro line", "# Project", "about it", "## Tasks", "- write tests", "## Empty"].join("\n");
const PARAGRAPH = "word ".repeat(100).trim();
const PARAGRAPHS_PER_LONG_SECTION = 8;
const LONG_SECTION = Array.from({ length: PARAGRAPHS_PER_LONG_SECTION }, () => PARAGRAPH).join("\n\n");
const NO_HEADING = "";
const NEARLY_FULL = "w".repeat(MAX_CHUNK_CHARS - 1);
const FENCE_HEAD = "```ts\nconst a = 1;";
const FENCED = `${FENCE_HEAD}\n\nconst b = 2;\n\`\`\``;
const PARAGRAPH_GAP = "\n\n";

describe("MarkdownChunker", () => {
    let chunker: MarkdownChunker;

    beforeEach(() => {
        chunker = new MarkdownChunker();
    });

    it("makes one chunk per heading, numbered in order", () => {
        const chunks = chunker.chunk(NOTE);

        expect(chunks).toEqual([
            { heading: NO_HEADING, seq: 0, text: "intro line" },
            { heading: "Project", seq: 1, text: "about it" },
            { heading: "Tasks", seq: 2, text: "- write tests" },
            { heading: "Empty", seq: 3, text: "" },
        ]);
    });

    it("leaves out empty text before the first heading", () => {
        const chunks = chunker.chunk("\n\n# Title\nbody");

        expect(chunks).toEqual([{ heading: "Title", seq: 0, text: "body" }]);
    });

    it("does not split at headings inside fenced code", () => {
        const chunks = chunker.chunk("# Code\n```\n# not a heading\n```");

        expect(chunks).toEqual([{ heading: "Code", seq: 0, text: "```\n# not a heading\n```" }]);
    });

    it("splits at a heading after inline code that only looks like a fence", () => {
        const chunks = chunker.chunk("# Code\n```js inline``` here\n# Next\nbody");

        expect(chunks).toEqual([
            { heading: "Code", seq: 0, text: "```js inline``` here" },
            { heading: "Next", seq: 1, text: "body" },
        ]);
    });

    it("returns no chunks for an empty note", () => {
        const chunks = chunker.chunk("  \n");

        expect(chunks).toEqual([]);
    });

    it("splits a long section at paragraphs, keeping its heading", () => {
        const chunks = chunker.chunk(`# Long\n${LONG_SECTION}`);

        expect(chunks.length).toBeGreaterThan(1);
        expect(chunks.every((chunk) => chunk.heading === "Long")).toBe(true);
        expect(chunks.every((chunk) => chunk.text.length <= MAX_CHUNK_CHARS)).toBe(true);
        expect(chunks.map((chunk) => chunk.text).join("\n\n")).toBe(LONG_SECTION);
    });

    it("cuts a paragraph longer than a chunk into pieces", () => {
        const huge = "x".repeat(MAX_CHUNK_CHARS * 2 + 1);

        const chunks = chunker.chunk(`# Huge\n${huge}`);

        expect(chunks.map((chunk) => chunk.text.length)).toEqual([MAX_CHUNK_CHARS, MAX_CHUNK_CHARS, 1]);
    });

    it("cuts a long paragraph between words", () => {
        const words = "alpha beta gamma ".repeat(MAX_CHUNK_CHARS / 10).trim();

        const chunks = chunker.chunk(`# Words\n${words}`);

        expect(chunks.every((chunk) => chunk.text.length <= MAX_CHUNK_CHARS)).toBe(true);
        expect(chunks.map((chunk) => chunk.text).join(" ")).toBe(words);
    });

    it("does not cut an emoji in half", () => {
        const emojis = "x" + "😀".repeat(MAX_CHUNK_CHARS);

        const chunks = chunker.chunk(`# Emoji\n${emojis}`);

        expect(chunks.map((chunk) => chunk.text).join("")).toBe(emojis);
        expect(chunks.every((chunk) => chunk.text.isWellFormed())).toBe(true);
    });

    it("never makes a chunk from the blank lines between paragraphs", () => {
        const chunks = chunker.chunk(`# Log\n${NEARLY_FULL}\n\n\n\nlast`);

        expect(chunks.map((chunk) => chunk.text)).toEqual([NEARLY_FULL, "last"]);
    });

    it("treats lines of only spaces and tabs as paragraph breaks", () => {
        const chunks = chunker.chunk(`# Log\n${NEARLY_FULL}\n\n \t \n\nlast`);

        expect(chunks.map((chunk) => chunk.text)).toEqual([NEARLY_FULL, "last"]);
    });

    it("keeps a fenced code block with blank lines in one chunk", () => {
        const lead = "w".repeat(MAX_CHUNK_CHARS - FENCE_HEAD.length - PARAGRAPH_GAP.length);

        const chunks = chunker.chunk(`# Code\n${lead}${PARAGRAPH_GAP}${FENCED}`);

        expect(chunks.map((chunk) => chunk.text)).toEqual([lead, FENCED]);
    });
});
