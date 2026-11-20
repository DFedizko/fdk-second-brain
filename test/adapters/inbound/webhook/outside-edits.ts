import type { FakeGitHubApi } from "../../outbound/github/__fake__/fake-github-api";

const FILE_MODE = "100644";
const DELETE_MESSAGE = "Delete";

export class OutsideEdits {
  constructor(
    private readonly repo: FakeGitHubApi,
    private readonly branch: string,
  ) {}

  write(path: string, content: string): void {
    this.repo.addEntry(this.branch, path, FILE_MODE, content);
  }

  head(): string {
    return this.repo.store.headOf(this.branch) ?? "";
  }

  delete(path: string): void {
    const files = new Map(this.repo.store.filesAt(this.branch));
    files.delete(path);
    this.repo.store.advance(this.branch, files, `${DELETE_MESSAGE} ${path}`);
  }
}
