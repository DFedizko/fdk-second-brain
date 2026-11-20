import type {
  IndexNoteInput,
  IndexNoteResult,
  NoteIndexer,
} from "../../../../src/application/use-cases/index-note";

const STATUS = "indexed";

export class SpyNoteIndexer implements NoteIndexer {
  readonly paths: string[] = [];
  readonly inputs: IndexNoteInput[] = [];

  async execute(input: IndexNoteInput): Promise<IndexNoteResult> {
    this.paths.push(input.path);
    this.inputs.push(input);
    return { path: input.path, status: STATUS };
  }
}
