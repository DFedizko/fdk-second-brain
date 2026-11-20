export interface BranchHead {
  hasReached(commit: string): Promise<boolean>;
}
