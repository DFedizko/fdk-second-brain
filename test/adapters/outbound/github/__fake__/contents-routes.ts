import type { FileTable } from "./fake-git-store";
import type { FakeCall, FakeRepoParts, FakeRoute } from "./fake-route";
import { DOCS_PAGE, MESSAGE, STATUS } from "./github-replies";

const CONTENTS = /^contents\/(.+)$/;
const SEPARATOR = "/";
const BASE64 = "base64";
const UTF8 = "utf8";
const REF = "ref";
const SYMLINK_MODE = "120000";
const SUBMODULE_MODE = "160000";

export class ContentsRoutes {
  constructor(private readonly parts: FakeRepoParts) {}

  all(): FakeRoute[] {
    return [
      { method: "GET", pattern: CONTENTS, reply: (call) => this.getContent(call) },
      { method: "PUT", pattern: CONTENTS, reply: (call) => this.putContent(call) },
      { method: "DELETE", pattern: CONTENTS, reply: (call) => this.deleteFile(call) },
    ];
  }

  private getContent(call: FakeCall): Response {
    const path = this.pathOf(call);
    const ref = call.query.get(REF) ?? this.parts.defaultBranch;
    const files = this.parts.store.filesAt(ref);
    const sha = files?.get(path);
    if (!files) return this.notFound(call, `No commit found for the ref ${ref}`);
    if (sha) return this.entryReply(call, files, path, sha, ref);
    if (this.isFolder(files, path)) return this.folderReply(call, files, path, ref);
    return this.notFound(call, MESSAGE.notFound);
  }

  private putContent(call: FakeCall): Response {
    const path = this.pathOf(call);
    const branch = this.branchOf(call);
    const files = this.parts.store.filesAt(branch) ?? this.firstCommitFiles(call);
    if (!files) return this.notFound(call, `Branch ${branch} not found`);
    const current = files.get(path);
    const rejection = this.rejectWrongSha(call, path, current);
    if (rejection) return rejection;
    const content = Buffer.from(String(call.body.content), BASE64).toString(UTF8);
    const sha = this.parts.store.addBlob(content);
    const commit = this.commitFiles(call, branch, new Map(files).set(path, sha));
    const status = current ? STATUS.ok : STATUS.created;
    const file = { path, sha, size: Buffer.byteLength(content, UTF8) };
    return this.parts.replies.json(
      status,
      this.parts.shapes.fileCommit(commit, branch, file),
      call.headers,
    );
  }

  private deleteFile(call: FakeCall): Response {
    const path = this.pathOf(call);
    const branch = this.branchOf(call);
    const files = this.parts.store.filesAt(branch);
    const current = files?.get(path);
    if (!files || !current) return this.notFound(call, MESSAGE.notFound);
    if (call.body.sha === undefined) return this.unprocessable(call, MESSAGE.shaMissing);
    if (call.body.sha !== current) return this.shaMismatch(call, path);
    const remaining = new Map(files);
    remaining.delete(path);
    const commit = this.commitFiles(call, branch, remaining);
    return this.parts.replies.json(
      STATUS.ok,
      this.parts.shapes.fileCommit(commit, branch),
      call.headers,
    );
  }

  private firstCommitFiles(call: FakeCall): FileTable | undefined {
    const firstCommit = !this.parts.store.hasRefs() && call.body.branch === undefined;
    return firstCommit ? new Map() : undefined;
  }

  private rejectWrongSha(call: FakeCall, path: string, current?: string): Response | undefined {
    const sha = call.body.sha;
    if (current && sha === undefined) return this.unprocessable(call, MESSAGE.shaMissing);
    if (sha !== undefined && sha !== current) return this.shaMismatch(call, path);
    return undefined;
  }

  private commitFiles(call: FakeCall, branch: string, files: FileTable) {
    return this.parts.store.advance(branch, files, String(call.body.message));
  }

  private entryReply(call: FakeCall, files: FileTable, path: string, sha: string, ref: string) {
    const mode = this.parts.store.modesAt(ref).get(path);
    if (mode === SUBMODULE_MODE) {
      return this.parts.replies.json(
        STATUS.ok,
        this.parts.shapes.submodule(path, sha, ref),
        call.headers,
      );
    }
    if (mode === SYMLINK_MODE) return this.symlinkReply(call, files, path, sha, ref);
    return this.fileReply(call, path, sha, ref);
  }

  private symlinkReply(call: FakeCall, files: FileTable, path: string, sha: string, ref: string) {
    const target = this.parts.store.blob(sha) ?? "";
    const targetSha = files.get(target);
    if (targetSha) return this.fileReply(call, target, targetSha, ref);
    const symlink = this.parts.shapes.symlink(path, sha, target, ref);
    return this.parts.replies.json(STATUS.ok, symlink, call.headers);
  }

  private fileReply(call: FakeCall, path: string, sha: string, ref: string): Response {
    const content = this.parts.store.bytesOf(sha) ?? new Uint8Array();
    const file = this.parts.shapes.contentFile(path, sha, content, ref);
    return this.parts.replies.json(STATUS.ok, file, call.headers);
  }

  private folderReply(call: FakeCall, files: FileTable, path: string, ref: string): Response {
    const listing = this.parts.shapes.folderListing(path, files, ref, (sha) => this.sizeOf(sha));
    return this.parts.replies.json(STATUS.ok, listing, call.headers);
  }

  private sizeOf(sha: string): number {
    return this.parts.store.bytesOf(sha)?.length ?? 0;
  }

  private isFolder(files: FileTable, path: string): boolean {
    return [...files.keys()].some((child) => child.startsWith(path + SEPARATOR));
  }

  private shaMismatch(call: FakeCall, path: string): Response {
    const message = `${path} does not match ${String(call.body.sha)}`;
    return this.parts.replies.error(STATUS.conflict, message, DOCS_PAGE.contents, call.headers);
  }

  private unprocessable(call: FakeCall, message: string): Response {
    return this.parts.replies.error(
      STATUS.unprocessable,
      message,
      DOCS_PAGE.contents,
      call.headers,
    );
  }

  private notFound(call: FakeCall, message: string): Response {
    return this.parts.replies.error(STATUS.notFound, message, DOCS_PAGE.contents, call.headers);
  }

  private branchOf(call: FakeCall): string {
    return typeof call.body.branch === "string" ? call.body.branch : this.parts.defaultBranch;
  }

  private pathOf(call: FakeCall): string {
    return call.params[0] ?? "";
  }
}
