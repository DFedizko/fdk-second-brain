import type { MarkdownChunk } from "./markdown-chunk";
import { MarkdownOutline, type OutlinePart } from "./markdown-outline";
import { safeCutIndex } from "./safe-cut";

export const MAX_CHUNK_CHARS = 1500;
const PARAGRAPH_BREAK = /\n(?:[ \t]*\n)+/;
const PARAGRAPH_JOINT = "\n\n";
const WORD_GAP = " ";

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
    const end = safeCutIndex(paragraph, MAX_CHUNK_CHARS);
    return this.cutAt(paragraph, end, end);
  }

  private cutAt(paragraph: string, end: number, restStart: number): string[] {
    return [paragraph.slice(0, end), ...this.cutParagraph(paragraph.slice(restStart))];
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
