import { InvalidPath } from "./errors/invalid-path";

export const PATH_SEPARATOR = "/";
const PARENT_SEGMENT = "..";
const HIDDEN_PREFIX = ".";
const BACKSLASH = "\\";
const EMPTY_SEGMENT = "";
const CONTROL_CHARACTER = /\p{Cc}/u;

export interface PathRule {
  readonly breaks: (raw: string, segments: string[]) => boolean;
  readonly reason: string;
}

export const SEGMENT_RULES: readonly PathRule[] = [
  { breaks: (raw) => raw.startsWith(PATH_SEPARATOR), reason: "it must not start with /" },
  { breaks: (raw) => raw.includes(BACKSLASH), reason: "use / as the separator" },
  { breaks: (raw) => CONTROL_CHARACTER.test(raw), reason: "it has a control character" },
  { breaks: (_raw, parts) => parts.includes(PARENT_SEGMENT), reason: "'..' is not allowed" },
  { breaks: (_raw, parts) => parts.includes(EMPTY_SEGMENT), reason: "it has an empty segment" },
  {
    breaks: (_raw, parts) => parts.some((part) => part.startsWith(HIDDEN_PREFIX)),
    reason: "dot-folders and dot-files are not allowed",
  },
];

export function rejectBrokenRule(raw: string, rules: readonly PathRule[]): void {
  const segments = raw.split(PATH_SEPARATOR);
  const broken = rules.find((rule) => rule.breaks(raw, segments));
  if (broken) throw new InvalidPath(raw, broken.reason);
}
