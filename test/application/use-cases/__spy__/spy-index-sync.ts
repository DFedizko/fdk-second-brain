import type { IndexSync, PathChange } from "../../../../src/application/use-cases/note-index-sync";

export class SpyIndexSync implements IndexSync {
  readonly changes: PathChange[] = [];

  async apply(change: PathChange): Promise<void> {
    this.changes.push(change);
  }
}
