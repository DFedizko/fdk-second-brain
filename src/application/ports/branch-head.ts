import type { NoteLookup } from "./note-lookup";

export interface BranchHead {
  readerAt(commit: string): Promise<NoteLookup | null>;
}
