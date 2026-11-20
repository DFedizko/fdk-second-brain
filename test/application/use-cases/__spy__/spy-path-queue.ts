import type { PathQueue } from "../../../../src/application/ports/path-queue";
import type { NotePath } from "../../../../src/domain/note-path";

export class SpyPathQueue implements PathQueue {
  readonly batches: string[][] = [];

  async enqueue(paths: readonly NotePath[]): Promise<void> {
    this.batches.push(paths.map((path) => path.value));
  }

  get paths(): string[] {
    return this.batches.flat();
  }
}
