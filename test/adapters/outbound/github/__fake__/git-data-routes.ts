import type { FileTable } from "./fake-git-store";
import type { FakeCall, FakeRepoParts, FakeRoute } from "./fake-route";
import { DOCS_PAGE, MESSAGE, STATUS } from "./github-replies";

const GET_REF = /^git\/ref\/heads\/(.+)$/;
const UPDATE_REF = /^git\/refs\/heads\/(.+)$/;
const ONE_COMMIT = /^git\/commits\/([0-9a-f]+)$/;
const COMMITS = /^git\/commits$/;
const ONE_TREE = /^git\/trees\/(.+)$/;
const TREES = /^git\/trees$/;
const SEPARATOR = "/";

interface TreeChange {
  readonly path?: unknown;
  readonly sha?: unknown;
  readonly content?: unknown;
}

export class GitDataRoutes {
  constructor(private readonly parts: FakeRepoParts) {}

  all(): FakeRoute[] {
    return [
      { method: "GET", pattern: GET_REF, reply: (call) => this.getRef(call) },
      { method: "PATCH", pattern: UPDATE_REF, reply: (call) => this.updateRef(call) },
      { method: "GET", pattern: ONE_COMMIT, reply: (call) => this.getCommit(call) },
      { method: "POST", pattern: COMMITS, reply: (call) => this.createCommit(call) },
      { method: "GET", pattern: ONE_TREE, reply: (call) => this.getTree(call) },
      { method: "POST", pattern: TREES, reply: (call) => this.createTree(call) },
    ];
  }

  private getRef(call: FakeCall): Response {
    const branch = this.param(call);
    const head = this.parts.store.headOf(branch);
    if (!head) return this.fail(call, STATUS.notFound, MESSAGE.notFound, DOCS_PAGE.refs);
    return this.reply(call, STATUS.ok, this.parts.shapes.gitRef(branch, head));
  }

  private updateRef(call: FakeCall): Response {
    const branch = this.param(call);
    const head = this.parts.store.headOf(branch);
    const target = this.parts.store.commit(String(call.body.sha));
    const unprocessable = STATUS.unprocessable;
    if (!head) return this.fail(call, unprocessable, MESSAGE.noReference, DOCS_PAGE.refs);
    if (!target) return this.fail(call, unprocessable, MESSAGE.noObject, DOCS_PAGE.refs);
    if (!call.body.force && !this.descendsFrom(target.sha, head)) {
      return this.fail(call, unprocessable, MESSAGE.notFastForward, DOCS_PAGE.refs);
    }
    this.parts.store.setRef(branch, target.sha);
    return this.reply(call, STATUS.ok, this.parts.shapes.gitRef(branch, target.sha));
  }

  private getCommit(call: FakeCall): Response {
    const commit = this.parts.store.commit(this.param(call));
    if (!commit) return this.fail(call, STATUS.notFound, MESSAGE.notFound, DOCS_PAGE.commits);
    return this.reply(call, STATUS.ok, this.parts.shapes.gitCommit(commit));
  }

  private createCommit(call: FakeCall): Response {
    const tree = String(call.body.tree);
    const parents = Array.isArray(call.body.parents) ? call.body.parents.map(String) : [];
    const unprocessable = STATUS.unprocessable;
    if (!this.parts.store.tree(tree)) {
      return this.fail(call, unprocessable, MESSAGE.noTree, DOCS_PAGE.commits);
    }
    if (!parents.every((sha) => this.parts.store.commit(sha))) {
      return this.fail(call, unprocessable, MESSAGE.noParent, DOCS_PAGE.commits);
    }
    const commit = this.parts.store.addCommit(tree, parents, String(call.body.message));
    return this.reply(call, STATUS.created, this.parts.shapes.gitCommit(commit));
  }

  private getTree(call: FakeCall): Response {
    const ref = this.param(call);
    const sha = this.parts.store.tree(ref) ? ref : this.parts.store.resolveCommit(ref)?.tree;
    const files = sha ? this.parts.store.tree(sha) : undefined;
    if (!sha || !files) return this.fail(call, STATUS.notFound, MESSAGE.notFound, DOCS_PAGE.trees);
    const tree = this.parts.shapes.gitTree(sha, files, (blob) => this.sizeOf(blob));
    const recursive = call.query.has("recursive");
    const entries = recursive ? tree.tree : tree.tree.filter((e) => !e.path.includes(SEPARATOR));
    return this.reply(call, STATUS.ok, { ...tree, tree: entries });
  }

  private createTree(call: FakeCall): Response {
    const base = call.body.base_tree === undefined ? new Map() : this.baseTree(call);
    const changes = Array.isArray(call.body.tree) ? (call.body.tree as TreeChange[]) : [];
    const files = base && this.applyChanges(new Map(base), changes);
    if (!files) return this.fail(call, STATUS.unprocessable, MESSAGE.invalidTree, DOCS_PAGE.trees);
    const sha = this.parts.store.addTree(files);
    const tree = this.parts.shapes.gitTree(sha, files, (blob) => this.sizeOf(blob));
    return this.reply(call, STATUS.created, tree);
  }

  private baseTree(call: FakeCall): FileTable | undefined {
    return this.parts.store.tree(String(call.body.base_tree));
  }

  private applyChanges(files: Map<string, string>, changes: TreeChange[]) {
    const applied = changes.every((change) => this.applyChange(files, change));
    return applied ? files : undefined;
  }

  private applyChange(files: Map<string, string>, change: TreeChange): boolean {
    const path = String(change.path);
    if (change.sha === null) return files.delete(path);
    if (typeof change.content === "string") {
      files.set(path, this.parts.store.addBlob(change.content));
      return true;
    }
    if (!this.parts.store.hasBlob(String(change.sha))) return false;
    files.set(path, String(change.sha));
    return true;
  }

  private descendsFrom(commitSha: string, ancestor: string): boolean {
    return this.parts.store.history(commitSha).some((commit) => commit.sha === ancestor);
  }

  private sizeOf(blobSha: string): number {
    return Buffer.byteLength(this.parts.store.blob(blobSha) ?? "");
  }

  private reply(call: FakeCall, status: number, body: unknown): Response {
    return this.parts.replies.json(status, body, call.headers);
  }

  private fail(call: FakeCall, status: number, message: string, docs: string): Response {
    return this.parts.replies.error(status, message, docs, call.headers);
  }

  private param(call: FakeCall): string {
    return call.params[0] ?? "";
  }
}
