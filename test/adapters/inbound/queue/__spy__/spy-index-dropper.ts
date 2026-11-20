import type { IndexNoteResult } from "../../../../../src/application/use-cases/index-note";
import type {
  DropNoteIndexInput,
  IndexDropper,
} from "../../../../../src/application/use-cases/drop-note-index";

const STATUS = "removed";

export class SpyIndexDropper implements IndexDropper {
  readonly paths: string[] = [];

  async execute(input: DropNoteIndexInput): Promise<IndexNoteResult> {
    this.paths.push(input.path);
    return { path: input.path, status: STATUS };
  }
}
