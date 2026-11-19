import { SectionNotFound } from "./errors/section-not-found";

const LINE_BREAK = "\n";
const ANY_LINE_BREAK = /\r?\n/;
const HEADING_LINE = /^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
const FENCE_LINE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const LEADING_HASHES = /^#+/;
const LEVEL_GROUP = 1;
const TITLE_GROUP = 2;
const FENCE_GROUP = 1;
const INFO_GROUP = 2;
const FENCE_CHAR_INDEX = 0;
const NOTHING = "";

interface Heading {
  readonly index: number;
  readonly level: number;
  readonly title: string;
}

export interface MarkdownSection {
  readonly heading: string;
  readonly content: string;
}

interface Scan {
  readonly fence: string | null;
  readonly headings: readonly Heading[];
}

export class MarkdownOutline {
  private readonly lines: string[];
  private readonly headings: readonly Heading[];

  constructor(content: string) {
    this.lines = content.split(ANY_LINE_BREAK);
    this.headings = this.scanHeadings();
  }

  section(heading: string): MarkdownSection {
    const wanted = this.normalize(heading);
    const start = this.headings.find((candidate) => this.normalize(candidate.title) === wanted);
    if (!start) throw new SectionNotFound(heading);
    const lines = this.lines.slice(start.index, this.findEnd(start));
    return { heading: start.title, content: lines.join(LINE_BREAK).trimEnd() };
  }

  private scanHeadings(): readonly Heading[] {
    const start: Scan = { fence: null, headings: [] };
    return this.lines.reduce((scan, line, index) => this.scanLine(scan, line, index), start)
      .headings;
  }

  private scanLine(scan: Scan, line: string, index: number): Scan {
    const fenceMatch = FENCE_LINE.exec(line);
    if (fenceMatch) return { ...scan, fence: this.toggleFence(scan.fence, fenceMatch) };
    const match = scan.fence ? null : HEADING_LINE.exec(line);
    if (!match) return scan;
    const heading = { index, level: match[LEVEL_GROUP]!.length, title: match[TITLE_GROUP]! };
    return { ...scan, headings: [...scan.headings, heading] };
  }

  private toggleFence(open: string | null, fenceMatch: RegExpExecArray): string | null {
    const marker = fenceMatch[FENCE_GROUP]!;
    if (open === null) return marker;
    return this.closesFence(open, marker, fenceMatch[INFO_GROUP]!) ? null : open;
  }

  private closesFence(open: string, marker: string, info: string): boolean {
    return (
      marker[FENCE_CHAR_INDEX] === open[FENCE_CHAR_INDEX] &&
      marker.length >= open.length &&
      info.trim() === NOTHING
    );
  }

  private findEnd(start: Heading): number {
    const next = this.headings.find((h) => h.index > start.index && h.level <= start.level);
    return next?.index ?? this.lines.length;
  }

  private normalize(title: string): string {
    return title.trim().replace(LEADING_HASHES, NOTHING).trim().toLowerCase();
  }
}
