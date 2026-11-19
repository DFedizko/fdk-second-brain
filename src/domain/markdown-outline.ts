import { SectionNotFound } from "./errors/section-not-found";

const LINE_BREAK = "\n";
const HEADING_LINE = /^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
const FENCE_LINE = /^ {0,3}(```|~~~)/;
const LEADING_HASHES = /^#+/;

interface Heading {
  readonly index: number;
  readonly level: number;
  readonly title: string;
}

interface Scan {
  readonly inFence: boolean;
  readonly headings: readonly Heading[];
}

export class MarkdownOutline {
  private readonly lines: string[];
  private readonly headings: readonly Heading[];

  constructor(content: string) {
    this.lines = content.split(LINE_BREAK);
    this.headings = this.lines.reduce<Scan>((scan, line, index) => this.scanLine(scan, line, index), {
      inFence: false,
      headings: [],
    }).headings;
  }

  section(heading: string): string {
    const wanted = this.normalize(heading);
    const start = this.headings.find((candidate) => this.normalize(candidate.title) === wanted);
    if (!start) throw new SectionNotFound(heading);
    return this.lines.slice(start.index, this.findEnd(start)).join(LINE_BREAK).trimEnd();
  }

  private scanLine(scan: Scan, line: string, index: number): Scan {
    if (FENCE_LINE.test(line)) return { ...scan, inFence: !scan.inFence };
    const match = scan.inFence ? null : HEADING_LINE.exec(line);
    if (!match) return scan;
    const heading = { index, level: match[1]!.length, title: match[2]! };
    return { ...scan, headings: [...scan.headings, heading] };
  }

  private findEnd(start: Heading): number {
    const next = this.headings.find((h) => h.index > start.index && h.level <= start.level);
    return next?.index ?? this.lines.length;
  }

  private normalize(title: string): string {
    return title.trim().replace(LEADING_HASHES, "").trim().toLowerCase();
  }
}
