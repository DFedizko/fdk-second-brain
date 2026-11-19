const HASH_ALGORITHM = "sha1";
const HEX = "hex";
const BLOB = "blob";
const TREE = "tree";
const COMMIT = "commit";
const NUL = "\0";

export type FileTable = ReadonlyMap<string, string>;

export interface FakeCommit {
  readonly sha: string;
  readonly tree: string;
  readonly parents: readonly string[];
  readonly message: string;
}

export class FakeGitStore {
  private readonly blobs = new Map<string, string>();
  private readonly trees = new Map<string, FileTable>();
  private readonly commits = new Map<string, FakeCommit>();
  private readonly refs = new Map<string, string>();

  addBlob(content: string): string {
    const sha = this.hashObject(BLOB, content);
    this.blobs.set(sha, content);
    return sha;
  }

  addTree(files: FileTable): string {
    const entries = [...files.entries()].sort(([left], [right]) => left.localeCompare(right));
    const sha = this.hashObject(TREE, JSON.stringify(entries));
    this.trees.set(sha, new Map(entries));
    return sha;
  }

  addCommit(tree: string, parents: readonly string[], message: string): FakeCommit {
    const sha = this.hashObject(COMMIT, JSON.stringify({ tree, parents, message }));
    const commit = { sha, tree, parents, message };
    this.commits.set(sha, commit);
    return commit;
  }

  setRef(branch: string, commitSha: string): void {
    this.refs.set(branch, commitSha);
  }

  headOf(branch: string): string | undefined {
    return this.refs.get(branch);
  }

  blob(sha: string): string | undefined {
    return this.blobs.get(sha);
  }

  hasBlob(sha: string): boolean {
    return this.blobs.has(sha);
  }

  tree(sha: string): FileTable | undefined {
    return this.trees.get(sha);
  }

  commit(sha: string): FakeCommit | undefined {
    return this.commits.get(sha);
  }

  resolveCommit(ref: string): FakeCommit | undefined {
    return this.commit(this.headOf(ref) ?? ref);
  }

  filesAt(ref: string): FileTable | undefined {
    const commit = this.resolveCommit(ref);
    return commit && this.tree(commit.tree);
  }

  advance(branch: string, files: FileTable, message: string): FakeCommit {
    const parent = this.headOf(branch);
    const commit = this.addCommit(this.addTree(files), parent ? [parent] : [], message);
    this.setRef(branch, commit.sha);
    return commit;
  }

  history(branch: string): FakeCommit[] {
    return this.walkHistory(this.resolveCommit(branch));
  }

  private walkHistory(commit: FakeCommit | undefined): FakeCommit[] {
    if (!commit) return [];
    const [parent] = commit.parents;
    return [commit, ...this.walkHistory(parent ? this.commit(parent) : undefined)];
  }

  private hashObject(type: string, body: string): string {
    const bytes = new TextEncoder().encode(body);
    const hasher = new Bun.CryptoHasher(HASH_ALGORITHM);
    hasher.update(`${type} ${bytes.length}${NUL}`);
    hasher.update(bytes);
    return hasher.digest(HEX);
  }
}
