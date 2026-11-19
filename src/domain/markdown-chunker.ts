import type { MarkdownChunk } from "./markdown-chunk";
import { MarkdownOutline, type OutlinePart } from "./markdown-outline";

export const MAX_CHUNK_CHARS = 1500;
const PARAGRAPH_BREAK = /\n[ \t]*\n/;
const PARAGRAPH_JOINT = "\n\n";
const WORD_GAP = " ";
const HIGH_SURROGATE_MIN = 0xd800;
const HIGH_SURROGATE_MAX = 0xdbff;

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
    if (paragraph.length <= MAX_CHUNK_CHARS) return [paragraph];
    const gap = paragraph.lastIndexOf(WORD_GAP, MAX_CHUNK_CHARS);
    if (gap > 0) return this.cutAt(paragraph, gap, gap + WORD_GAP.length);
    const end = this.findSafeEnd(paragraph);
    return this.cutAt(paragraph, end, end);
  }

  private cutAt(paragraph: string, end: number, restStart: number): string[] {
    return [paragraph.slice(0, end), ...this.cutParagraph(paragraph.slice(restStart))];
  }

  private findSafeEnd(paragraph: string): number {
    const last = paragraph.charCodeAt(MAX_CHUNK_CHARS - 1);
    const splitsPair = last >= HIGH_SURROGATE_MIN && last <= HIGH_SURROGATE_MAX;
    return splitsPair ? MAX_CHUNK_CHARS - 1 : MAX_CHUNK_CHARS;
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
