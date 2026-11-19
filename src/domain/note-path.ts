import { PATH_SEPARATOR, SEGMENT_RULES, rejectBrokenRule, type PathRule } from "./path-rules";

const NOTE_EXTENSION = ".md";

const NOTE_PATH_RULES: readonly PathRule[] = [
  { breaks: (raw) => !raw.endsWith(NOTE_EXTENSION), reason: "only .md files are allowed" },
  ...SEGMENT_RULES,
];

export class NotePath {
  private constructor(readonly value: string) {}

  static of(raw: string): NotePath {
    rejectBrokenRule(raw, NOTE_PATH_RULES);
    return new NotePath(raw);
  }

  get folder(): string {
    return this.value.split(PATH_SEPARATOR).slice(0, -1).join(PATH_SEPARATOR);
  }

  equals(other: NotePath): boolean {
    return this.value === other.value;
  }
}
