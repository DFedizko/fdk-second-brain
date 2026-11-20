import type {
  IndexNoteInput,
  IndexNoteResult,
  NoteIndexer,
} from "../../../../src/application/use-cases/index-note";

const STATUS = "indexed";

export class SpyNoteIndexer implements NoteIndexer {
  readonly paths: string[] = [];

  async execute(input: IndexNoteInput): Promise<IndexNoteResult> {
    this.paths.push(input.path);
    return { path: input.path, status: STATUS };
  }
}
