import { InvalidPath } from "./errors/invalid-path";

const NOTE_EXTENSION = ".md";
const SEPARATOR = "/";
const PARENT_SEGMENT = "..";
const HIDDEN_PREFIX = ".";
const BACKSLASH = "\\";

interface PathRule {
  readonly breaks: (raw: string, segments: string[]) => boolean;
  readonly reason: string;
}

const PATH_RULES: readonly PathRule[] = [
  { breaks: (raw) => !raw.endsWith(NOTE_EXTENSION), reason: "only .md files are allowed" },
  { breaks: (raw) => raw.startsWith(SEPARATOR), reason: "it must not start with /" },
  { breaks: (raw) => raw.includes(BACKSLASH), reason: "use / as the separator" },
  { breaks: (_raw, parts) => parts.includes(PARENT_SEGMENT), reason: "'..' is not allowed" },
  { breaks: (_raw, parts) => parts.includes(""), reason: "it has an empty segment" },
  {
    breaks: (_raw, parts) => parts.some((part) => part.startsWith(HIDDEN_PREFIX)),
    reason: "dot-folders and dot-files are not allowed",
  },
];

export class NotePath {
  private constructor(readonly value: string) {}

  static of(raw: string): NotePath {
    NotePath.rejectInvalid(raw);
    return new NotePath(raw);
  }

  get folder(): string {
    return this.value.split(SEPARATOR).slice(0, -1).join(SEPARATOR);
  }

  equals(other: NotePath): boolean {
    return this.value === other.value;
  }

  private static rejectInvalid(raw: string): void {
    const segments = raw.split(SEPARATOR);
    const broken = PATH_RULES.find((rule) => rule.breaks(raw, segments));
    if (broken) throw new InvalidPath(raw, broken.reason);
  }
}
