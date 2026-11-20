import type { IndexFailureLog } from "../ports/index-failure-log";
import type { NoteIndexer } from "./index-note";

export interface PathChange {
  readonly indexed: readonly string[];
  readonly removed: readonly string[];
}

export interface IndexSync {
  apply(change: PathChange): Promise<void>;
}

// The note is already saved when this runs, so an index failure is only logged:
// the daily reconciliation repairs the index later.
export class NoteIndexSync implements IndexSync {
  constructor(
    private readonly indexer: NoteIndexer,
    private readonly remover: NoteIndexer,
    private readonly log: IndexFailureLog,
  ) {}

  async apply(change: PathChange): Promise<void> {
    await Promise.all([
      ...change.indexed.map((path) => this.runSafely(this.indexer, path)),
      ...change.removed.map((path) => this.runSafely(this.remover, path)),
    ]);
  }

  private async runSafely(job: NoteIndexer, path: string): Promise<void> {
    await job.execute({ path }).then(
      () => undefined,
      (error: unknown) => this.log.report({ path, error }),
    );
  }
}
