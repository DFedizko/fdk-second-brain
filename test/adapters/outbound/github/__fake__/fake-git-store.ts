const HASH_ALGORITHM = "sha1";
const HEX = "hex";
const BLOB = "blob";
const TREE = "tree";
const COMMIT = "commit";
const NUL = "\0";

export type FileTable = ReadonlyMap<string, string>;
export type ModeTable = ReadonlyMap<string, string>;

export interface FakeCommit {
  readonly sha: string;
  readonly tree: string;
  readonly parents: readonly string[];
  readonly message: string;
}

export class FakeGitStore {
  private readonly blobs = new Map<string, string>();
  private readonly trees = new Map<string, FileTable>();
  private readonly treeModes = new Map<string, ModeTable>();
  private readonly commits = new Map<string, FakeCommit>();
  private readonly refs = new Map<string, string>();

  addBlob(content: string): string {
    const sha = this.hashObject(BLOB, content);
    this.blobs.set(sha, content);
    return sha;
  }

  addTree(files: FileTable, modes: ModeTable = new Map()): string {
    const entries = this.sorted(files);
    const special = this.sorted(modes);
    const body = special.length === 0 ? entries : { entries, special };
    const sha = this.hashObject(TREE, JSON.stringify(body));
    this.trees.set(sha, new Map(entries));
    this.treeModes.set(sha, new Map(special));
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

  modesOf(treeSha: string): ModeTable {
    return this.treeModes.get(treeSha) ?? new Map();
  }

  modesAt(ref: string): ModeTable {
    const commit = this.resolveCommit(ref);
    return commit ? this.modesOf(commit.tree) : new Map();
  }

  hasRefs(): boolean {
    return this.refs.size > 0;
  }

  dropRef(branch: string): void {
    this.refs.delete(branch);
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

  advance(branch: string, files: FileTable, message: string, modes?: ModeTable): FakeCommit {
    const parent = this.headOf(branch);
    const kept = modes ?? this.keptModes(this.modesAt(branch), files);
    const commit = this.addCommit(this.addTree(files, kept), parent ? [parent] : [], message);
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

  private keptModes(modes: ModeTable, files: FileTable): ModeTable {
    return new Map([...modes].filter(([path]) => files.has(path)));
  }

  private sorted(table: ReadonlyMap<string, string>): [string, string][] {
    return [...table.entries()].sort(([left], [right]) => left.localeCompare(right));
  }

  private hashObject(type: string, body: string): string {
    const bytes = new TextEncoder().encode(body);
    const hasher = new Bun.CryptoHasher(HASH_ALGORITHM);
    hasher.update(`${type} ${bytes.length}${NUL}`);
    hasher.update(bytes);
    return hasher.digest(HEX);
  }
}
