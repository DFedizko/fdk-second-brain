import type { MarkdownChunk } from "./markdown-chunk";
import { MarkdownOutline, type OutlinePart } from "./markdown-outline";

export const MAX_CHUNK_CHARS = 1500;
const PARAGRAPH_BREAK = /\n[ \t]*\n/;
const PARAGRAPH_JOINT = "\n\n";
const MIN_PIECES = 1;

export class MarkdownChunker {
  chunk(content: string): MarkdownChunk[] {
    return new MarkdownOutline(content)
      .parts()
      .flatMap((part) => this.splitPart(part))
      .map((chunk, seq) => ({ ...chunk, seq }));
  }

  private splitPart(part: OutlinePart): Omit<MarkdownChunk, "seq">[] {
    const pieces = part.body.split(PARAGRAPH_BREAK).flatMap((p) => this.cutParagraph(p));
    return this.packPieces(pieces).map((text) => ({ heading: part.heading, text }));
  }

  private cutParagraph(paragraph: string): string[] {
    const count = Math.max(MIN_PIECES, Math.ceil(paragraph.length / MAX_CHUNK_CHARS));
    return Array.from({ length: count }, (_, index) =>
      paragraph.slice(index * MAX_CHUNK_CHARS, (index + 1) * MAX_CHUNK_CHARS),
    );
  }

  private packPieces(pieces: string[]): string[] {
    return pieces.reduce<string[]>((texts, piece) => this.addPiece(texts, piece), []);
  }

  private addPiece(texts: string[], piece: string): string[] {
    const last = texts.at(-1);
    if (last === undefined) return [piece];
    const joined = `${last}${PARAGRAPH_JOINT}${piece}`;
    if (joined.length > MAX_CHUNK_CHARS) return [...texts, piece];
    return [...texts.slice(0, -1), joined];
  }
}
