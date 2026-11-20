import type { NotePath } from "../../domain/note-path";

export interface PathQueue {
  enqueue(paths: readonly NotePath[]): Promise<void>;
}
