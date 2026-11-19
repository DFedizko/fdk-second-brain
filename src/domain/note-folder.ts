import type { NotePath } from "./note-path";
import { PATH_SEPARATOR, SEGMENT_RULES, rejectBrokenRule } from "./path-rules";

const ROOT = "";

export class NoteFolder {
  private constructor(readonly value: string) {}

  static of(raw: string): NoteFolder {
    const trimmed = NoteFolder.dropTrailingSlash(raw);
    if (trimmed !== ROOT) rejectBrokenRule(trimmed, SEGMENT_RULES);
    return new NoteFolder(trimmed);
  }

  contains(path: NotePath): boolean {
    return this.value === ROOT || path.value.startsWith(this.value + PATH_SEPARATOR);
  }

  private static dropTrailingSlash(raw: string): string {
    return raw.endsWith(PATH_SEPARATOR) ? raw.slice(0, -PATH_SEPARATOR.length) : raw;
  }
}
