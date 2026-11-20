import type { FakeGitStore } from "./fake-git-store";
import { DOCS_PAGE, MESSAGE, STATUS, type GitHubReplies } from "./github-replies";

const PUT = "PUT";
const GET = "GET";
const GIT_DATA = /^git\//;
const REF_READ = /^git\/ref\//;
const REPO_ROOT = "";

export interface EmptyRepoCall {
  readonly method: string;
  readonly route: string;
  readonly body: Record<string, unknown>;
  readonly headers: Headers;
}

type Dispatch = () => Response;

export class EmptyRepoReplies {
  private branchConflict = false;
  private laggingRefReads = 0;

  constructor(
    private readonly store: FakeGitStore,
    private readonly replies: GitHubReplies,
  ) {}

  rejectBranchWrites(): void {
    this.branchConflict = true;
  }

  lagRefReads(times: number): void {
    this.laggingRefReads = times;
  }

  answer(call: EmptyRepoCall, dispatch: Dispatch): Response | undefined {
    if (!this.store.hasRefs()) return this.emptyReply(call, dispatch);
    if (call.method !== GET || !REF_READ.test(call.route) || this.laggingRefReads <= 0) {
      return undefined;
    }
    this.laggingRefReads -= 1;
    return this.emptyGitData(call);
  }

  private emptyReply(call: EmptyRepoCall, dispatch: Dispatch): Response {
    if (GIT_DATA.test(call.route)) return this.emptyGitData(call);
    if (call.method === PUT && call.body.branch !== undefined && this.branchConflict) {
      return this.fail(call, STATUS.conflict, MESSAGE.emptyRepo);
    }
    if (call.method === PUT || call.route === REPO_ROOT) return dispatch();
    return this.fail(call, STATUS.notFound, MESSAGE.emptyContents);
  }

  private emptyGitData(call: EmptyRepoCall): Response {
    return this.replies.error(STATUS.conflict, MESSAGE.emptyRepo, DOCS_PAGE.root, call.headers);
  }

  private fail(call: EmptyRepoCall, status: number, message: string): Response {
    return this.replies.error(status, message, DOCS_PAGE.contents, call.headers);
  }
}
