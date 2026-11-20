import type { NotePath } from "../../domain/note-path";

export interface PathQueue {
    enqueue(paths: readonly NotePath[], commit?: string): Promise<void>;
}
