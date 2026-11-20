import type {
  IndexNoteInput,
  IndexNoteResult,
  NoteIndexer,
} from "../../../../src/application/use-cases/index-note";

export class FailingNoteIndexer implements NoteIndexer {
  constructor(private readonly error: unknown) {}

  async execute(_input: IndexNoteInput): Promise<IndexNoteResult> {
    throw this.error;
  }
}
