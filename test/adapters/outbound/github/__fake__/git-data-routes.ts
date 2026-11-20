import type { FakeCall, FakeRepoParts, FakeRoute } from "./fake-route";
import { DOCS_PAGE, MESSAGE, STATUS } from "./github-replies";

const GET_REF = /^git\/ref\/heads\/(.+)$/;
const UPDATE_REF = /^git\/refs\/heads\/(.+)$/;
const REFS = /^git\/refs$/;
const BRANCH_PREFIX = "refs/heads/";
const ONE_COMMIT = /^git\/commits\/([0-9a-f]+)$/;
const COMMITS = /^git\/commits$/;
const ONE_TREE = /^git\/trees\/(.+)$/;
const TREES = /^git\/trees$/;
const ONE_BLOB = /^git\/blobs\/([0-9a-f]+)$/;
const FILE_MODE = "100644";
const SUBMODULE_MODE = "160000";
const SEPARATOR = "/";
const RECURSIVE = "recursive";

interface TreeChange {
  readonly path?: unknown;
  readonly sha?: unknown;
  readonly content?: unknown;
  readonly mode?: unknown;
}

interface TreeDraft {
  readonly files: Map<string, string>;
  readonly modes: Map<string, string>;
}

export class GitDataRoutes {
  constructor(private readonly parts: FakeRepoParts) {}

  all(): FakeRoute[] {
    return [
      { method: "GET", pattern: GET_REF, reply: (call) => this.getRef(call) },
      { method: "PATCH", pattern: UPDATE_REF, reply: (call) => this.updateRef(call) },
      { method: "POST", pattern: REFS, reply: (call) => this.createRef(call) },
      { method: "GET", pattern: ONE_COMMIT, reply: (call) => this.getCommit(call) },
      { method: "POST", pattern: COMMITS, reply: (call) => this.createCommit(call) },
      { method: "GET", pattern: ONE_TREE, reply: (call) => this.getTree(call) },
      { method: "POST", pattern: TREES, reply: (call) => this.createTree(call) },
      { method: "GET", pattern: ONE_BLOB, reply: (call) => this.getBlob(call) },
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

  private createRef(call: FakeCall): Response {
    const ref = String(call.body.ref);
    const branch = ref.slice(BRANCH_PREFIX.length);
    const target = this.parts.store.commit(String(call.body.sha));
    const unprocessable = STATUS.unprocessable;
    if (!ref.startsWith(BRANCH_PREFIX) || this.parts.store.headOf(branch)) {
      return this.fail(call, unprocessable, MESSAGE.refExists, DOCS_PAGE.refs);
    }
    if (!target) return this.fail(call, unprocessable, MESSAGE.noObject, DOCS_PAGE.refs);
    this.parts.store.setRef(branch, target.sha);
    return this.reply(call, STATUS.created, this.parts.shapes.gitRef(branch, target.sha));
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
    const modes = this.parts.store.modesOf(sha);
    const folders = (folder: string) => this.parts.store.folderSha(sha, folder);
    const tree = this.parts.shapes.gitTree(sha, files, (blob) => this.sizeOf(blob), modes, folders);
    const recursive = call.query.has(RECURSIVE);
    const entries = recursive ? tree.tree : tree.tree.filter((e) => !e.path.includes(SEPARATOR));
    const truncated = recursive && this.parts.limits.truncateTrees;
    return this.reply(call, STATUS.ok, { ...tree, truncated, tree: entries });
  }

  private createTree(call: FakeCall): Response {
    const draft = call.body.base_tree === undefined ? this.emptyDraft() : this.baseDraft(call);
    const changes = Array.isArray(call.body.tree) ? (call.body.tree as TreeChange[]) : [];
    const applied = draft && changes.every((change) => this.applyChange(draft, change));
    if (!draft || !applied) {
      return this.fail(call, STATUS.unprocessable, MESSAGE.invalidTree, DOCS_PAGE.trees);
    }
    const sha = this.parts.store.addTree(draft.files, draft.modes);
    const sizes = (blob: string) => this.sizeOf(blob);
    return this.reply(
      call,
      STATUS.created,
      this.parts.shapes.gitTree(sha, draft.files, sizes, draft.modes),
    );
  }

  private getBlob(call: FakeCall): Response {
    const sha = this.param(call);
    const content = this.parts.store.bytesOf(sha);
    if (content === undefined) {
      return this.fail(call, STATUS.notFound, MESSAGE.notFound, DOCS_PAGE.blobs);
    }
    return this.reply(call, STATUS.ok, this.parts.shapes.gitBlob(sha, content));
  }

  private emptyDraft(): TreeDraft {
    return { files: new Map(), modes: new Map() };
  }

  private baseDraft(call: FakeCall): TreeDraft | undefined {
    const sha = String(call.body.base_tree);
    const files = this.parts.store.tree(sha);
    if (!files) return undefined;
    return { files: new Map(files), modes: new Map(this.parts.store.modesOf(sha)) };
  }

  private applyChange(draft: TreeDraft, change: TreeChange): boolean {
    const path = String(change.path);
    draft.modes.delete(path);
    if (change.sha === null) return draft.files.delete(path);
    const mode = typeof change.mode === "string" ? change.mode : FILE_MODE;
    if (mode !== FILE_MODE) draft.modes.set(path, mode);
    if (typeof change.content === "string") {
      draft.files.set(path, this.parts.store.addBlob(change.content));
      return true;
    }
    const known = mode === SUBMODULE_MODE || this.parts.store.hasBlob(String(change.sha));
    if (!known) return false;
    draft.files.set(path, String(change.sha));
    return true;
  }

  private descendsFrom(commitSha: string, ancestor: string): boolean {
    return this.parts.store.history(commitSha).some((commit) => commit.sha === ancestor);
  }

  private sizeOf(blobSha: string): number {
    return this.parts.store.bytesOf(blobSha)?.length ?? 0;
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
