const HASH_ALGORITHM = "sha1";
const HEX = "hex";
const BLOB = "blob";
const TREE = "tree";
const COMMIT = "commit";
const NUL = "\0";
const SEPARATOR = "/";

export type FileTable = ReadonlyMap<string, string>;
export type ModeTable = ReadonlyMap<string, string>;

export interface FakeCommit {
    readonly sha: string;
    readonly tree: string;
    readonly parents: readonly string[];
    readonly message: string;
}

export class FakeGitStore {
    private readonly blobs = new Map<string, Uint8Array>();
    private readonly trees = new Map<string, FileTable>();
    private readonly treeModes = new Map<string, ModeTable>();
    private readonly subtrees = new Map<string, ReadonlyMap<string, string>>();
    private readonly commits = new Map<string, FakeCommit>();
    private readonly refs = new Map<string, string>();

    addBlob(content: string | Uint8Array): string {
        const bytes = typeof content === "string" ? new TextEncoder().encode(content) : content;
        const sha = this.hashObject(BLOB, bytes);
        this.blobs.set(sha, bytes);
        return sha;
    }

    addTree(files: FileTable, modes: ModeTable = new Map()): string {
        const entries = this.sorted(files);
        const special = this.sorted(modes);
        const body = special.length === 0 ? entries : { entries, special };
        const sha = this.hashObject(TREE, JSON.stringify(body));
        this.trees.set(sha, new Map(entries));
        this.treeModes.set(sha, new Map(special));
        this.subtrees.set(sha, this.addSubtrees(files, modes));
        return sha;
    }

    folderSha(treeSha: string, folder: string): string | undefined {
        return folder
            .split(SEPARATOR)
            .reduce<string | undefined>((tree, name) => tree && this.subtrees.get(tree)?.get(name), treeSha);
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
        const bytes = this.blobs.get(sha);
        return bytes && new TextDecoder().decode(bytes);
    }

    bytesOf(sha: string): Uint8Array | undefined {
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

    private addSubtrees(files: FileTable, modes: ModeTable): ReadonlyMap<string, string> {
        const folders = [...files.keys()].filter((path) => path.includes(SEPARATOR));
        const names = [...new Set(folders.map((path) => path.split(SEPARATOR)[0] ?? ""))];
        return new Map(names.map((name) => [name, this.addSubtree(files, modes, name)]));
    }

    private addSubtree(files: FileTable, modes: ModeTable, name: string): string {
        const prefix = name + SEPARATOR;
        return this.addTree(this.within(files, prefix), this.within(modes, prefix));
    }

    private within(table: ReadonlyMap<string, string>, prefix: string): Map<string, string> {
        const inside = [...table].filter(([path]) => path.startsWith(prefix));
        return new Map(inside.map(([path, value]) => [path.slice(prefix.length), value]));
    }

    private keptModes(modes: ModeTable, files: FileTable): ModeTable {
        return new Map([...modes].filter(([path]) => files.has(path)));
    }

    private sorted(table: ReadonlyMap<string, string>): [string, string][] {
        return [...table.entries()].sort(([left], [right]) => left.localeCompare(right));
    }

    private hashObject(type: string, body: string | Uint8Array): string {
        const bytes = typeof body === "string" ? new TextEncoder().encode(body) : body;
        const hasher = new Bun.CryptoHasher(HASH_ALGORITHM);
        hasher.update(`${type} ${bytes.length}${NUL}`);
        hasher.update(bytes);
        return hasher.digest(HEX);
    }
}
