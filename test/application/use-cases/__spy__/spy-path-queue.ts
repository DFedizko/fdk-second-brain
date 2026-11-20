import type { PathQueue } from "../../../../src/application/ports/path-queue";
import type { NotePath } from "../../../../src/domain/note-path";

export class SpyPathQueue implements PathQueue {
  readonly batches: string[][] = [];
  readonly commits: (string | undefined)[] = [];

  async enqueue(paths: readonly NotePath[], commit?: string): Promise<void> {
    this.batches.push(paths.map((path) => path.value));
    this.commits.push(commit);
  }

  get paths(): string[] {
    return this.batches.flat();
  }
}
