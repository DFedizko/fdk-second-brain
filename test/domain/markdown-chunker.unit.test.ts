import { MarkdownChunker, MAX_CHUNK_CHARS } from "../../src/domain/markdown-chunker";

const NOTE = ["intro line", "# Project", "about it", "## Tasks", "- write tests", "## Empty"].join(
  "\n",
);
const PARAGRAPH = "word ".repeat(100).trim();
const PARAGRAPHS_PER_LONG_SECTION = 8;
const LONG_SECTION = Array.from({ length: PARAGRAPHS_PER_LONG_SECTION }, () => PARAGRAPH).join(
  "\n\n",
);
const NO_HEADING = "";

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
});
