import { Octokit } from "@octokit/rest";
import { SILENT_LOG } from "../../../../../src/adapters/outbound/github/silent-log";
import { ContentsRoutes } from "./contents-routes";
import { FakeGitStore } from "./fake-git-store";
import type { FakeLimits, FakeRepoParts, FakeRoute } from "./fake-route";
import { GitDataRoutes } from "./git-data-routes";
import { DOCS_PAGE, GitHubReplies, MESSAGE, STATUS } from "./github-replies";
import { GitHubShapes } from "./github-shapes";

// Built from https://docs.github.com/en/rest/repos/contents, /git/refs, /git/trees,
// /git/commits, /git/blobs and /using-the-rest-api/rate-limits-for-the-rest-api, checked 2026-11-19.

export interface FakeRepoSetup {
  readonly owner: string;
  readonly repo: string;
  readonly token: string;
  readonly branches: readonly string[];
  readonly seed: Readonly<Record<string, string>>;
  readonly empty?: boolean;
}

const API_PREFIX = "/repos/";
const SEPARATOR = "/";
const AUTH_SCHEMES = ["token", "bearer"];
const RATE_LIMIT = 5000;
const RESET_EPOCH_SECONDS = 1795000000;
const RETRY_AFTER_SECONDS = 60;
const CORE_RESOURCE = "core";
const SEED_MESSAGE = "Initial commit";
const NETWORK_FAILURE = "fetch failed";
const RETRY_AFTER = "retry-after";
const PATCH = "PATCH";
const REF_UPDATE = /^git\/refs\/heads\/(.+)$/;
const RACING_MESSAGE = "A concurrent commit";
const AUTHORIZATION = "authorization";
const SUBMODULE_MODE = "160000";
const PUT = "PUT";
const FILE_WRITES = [PUT, "DELETE"];
const GIT_DATA = /^git\//;
const CONTENTS = /^contents\//;
const ADD_MESSAGE = "Add";

type HttpOutage = "secondary" | "secondaryForbidden" | "forbidden" | "server";
type Outage = HttpOutage | "network";

export class FakeGitHubApi {
  readonly store = new FakeGitStore();
  private readonly replies = new GitHubReplies();
  private readonly routes: FakeRoute[];
  private remaining = RATE_LIMIT;
  private outage?: Outage;
  private tokenRevoked = false;
  private refRaces = 0;
  private contentRaces = 0;
  private refDrops = false;
  private readonly limits: FakeLimits = { truncateTrees: false };
  readonly served: number[] = [];

  constructor(private readonly setup: FakeRepoSetup) {
    const shapes = new GitHubShapes(setup.owner, setup.repo);
    const defaultBranch = setup.branches[0] ?? "";
    const parts: FakeRepoParts = {
      store: this.store,
      shapes,
      replies: this.replies,
      defaultBranch,
      limits: this.limits,
    };
    this.routes = [...new ContentsRoutes(parts).all(), ...new GitDataRoutes(parts).all()];
    this.seedBranches();
  }

  readonly fetch = async (input: string | URL | Request, init?: RequestInit) => {
    const request = new Request(input, init);
    if (this.outage === "network") throw new TypeError(NETWORK_FAILURE);
    const body = request.body ? await request.json() : {};
    const response = this.answer(request, body as Record<string, unknown>);
    this.served.push(response.status);
    return response;
  };

  octokit(token: string): Octokit {
    return new Octokit({ auth: token, request: { fetch: this.fetch }, log: SILENT_LOG });
  }

  filesOn(branch: string): Record<string, string> {
    const files = [...(this.store.filesAt(branch)?.entries() ?? [])];
    return Object.fromEntries(files.map(([path, sha]) => [path, this.store.blob(sha) ?? ""]));
  }

  exhaustRateLimit(): void {
    this.remaining = 0;
  }

  startOutage(outage: Outage): void {
    this.outage = outage;
  }

  revokeToken(): void {
    this.tokenRevoked = true;
  }

  commitBeforeRefUpdates(times: number): void {
    this.refRaces = times;
  }

  addEntry(branch: string, path: string, mode: string, target: string | Uint8Array): void {
    const sha =
      typeof target === "string" && mode === SUBMODULE_MODE ? target : this.store.addBlob(target);
    const files = new Map(this.store.filesAt(branch)).set(path, sha);
    const modes = new Map(this.store.modesAt(branch)).set(path, mode);
    this.store.advance(branch, files, `${ADD_MESSAGE} ${path}`, modes);
  }

  dropBranchBeforeRefUpdates(): void {
    this.refDrops = true;
  }

  commitDuringFileWrites(times: number): void {
    this.contentRaces = times;
  }

  truncateTrees(): void {
    this.limits.truncateTrees = true;
  }

  private answer(request: Request, body: Record<string, unknown>): Response {
    const headers = this.rateLimitHeaders();
    const route = this.routeOf(new URL(request.url));
    if (!this.isAuthorized(request)) return this.badCredentials(headers);
    if (this.remaining <= 0) return this.rateLimited(headers);
    this.remaining -= 1;
    if (this.outage && this.outage !== "network") return this.outageReply(this.outage, headers);
    if (route === undefined) return this.notFound(headers);
    if (!this.store.hasRefs()) return this.emptyRepoReply(request, route, body, headers);
    this.raceRefUpdate(request.method, route);
    const raced = this.raceFileWrite(request.method, route, body, headers);
    return raced ?? this.dispatch(request, route, body, headers);
  }

  private dispatch(
    request: Request,
    route: string,
    body: Record<string, unknown>,
    headers: Headers,
  ) {
    const query = new URL(request.url).searchParams;
    const match = this.routes
      .filter((candidate) => candidate.method === request.method)
      .map((candidate) => ({ candidate, params: candidate.pattern.exec(route) }))
      .find((found) => found.params);
    if (!match?.params) return this.notFound(headers);
    const params = match.params.slice(1);
    return match.candidate.reply({ params, query, body, headers });
  }

  private raceRefUpdate(method: string, route: string): void {
    const branch = REF_UPDATE.exec(route)?.[1];
    if (method !== PATCH || !branch) return;
    if (this.refDrops) this.store.dropRef(branch);
    if (this.refRaces <= 0) return;
    this.refRaces -= 1;
    this.store.advance(branch, this.store.filesAt(branch) ?? new Map(), RACING_MESSAGE);
  }

  private raceFileWrite(
    method: string,
    route: string,
    body: Record<string, unknown>,
    headers: Headers,
  ): Response | undefined {
    if (!FILE_WRITES.includes(method) || !CONTENTS.test(route) || this.contentRaces <= 0) {
      return undefined;
    }
    this.contentRaces -= 1;
    const branch = typeof body.branch === "string" ? body.branch : (this.setup.branches[0] ?? "");
    const before = this.store.headOf(branch) ?? "";
    const after = this.store.advance(
      branch,
      this.store.filesAt(branch) ?? new Map(),
      RACING_MESSAGE,
    );
    const message = `${branch} is at ${after.sha} but expected ${before}`;
    return this.replies.error(STATUS.conflict, message, DOCS_PAGE.contents, headers);
  }

  // Checked 2026-11-19: Git data endpoints answer 409 on an empty repository, reading
  // contents answers 404, and creating a file through the contents API makes the first commit.
  private emptyRepoReply(
    request: Request,
    route: string,
    body: Record<string, unknown>,
    headers: Headers,
  ): Response {
    if (GIT_DATA.test(route)) {
      return this.replies.error(STATUS.conflict, MESSAGE.emptyRepo, DOCS_PAGE.root, headers);
    }
    if (request.method === PUT) return this.dispatch(request, route, body, headers);
    return this.replies.error(STATUS.notFound, MESSAGE.emptyContents, DOCS_PAGE.contents, headers);
  }

  private routeOf(url: URL): string | undefined {
    const repoPrefix = `${API_PREFIX}${this.setup.owner}${SEPARATOR}${this.setup.repo}${SEPARATOR}`;
    if (!url.pathname.startsWith(repoPrefix)) return undefined;
    return decodeURIComponent(url.pathname.slice(repoPrefix.length));
  }

  private isAuthorized(request: Request): boolean {
    const [scheme, token] = (request.headers.get(AUTHORIZATION) ?? "").split(" ");
    const known = AUTH_SCHEMES.includes(scheme?.toLowerCase() ?? "") && token === this.setup.token;
    return known && !this.tokenRevoked;
  }

  private outageReply(outage: HttpOutage, headers: Headers): Response {
    const replies: Record<HttpOutage, () => Response> = {
      forbidden: () =>
        this.replies.error(STATUS.forbidden, MESSAGE.noPermission, DOCS_PAGE.root, headers),
      server: () =>
        this.replies.error(STATUS.serverError, MESSAGE.serverError, DOCS_PAGE.root, headers),
      secondary: () => this.secondaryLimit(STATUS.tooManyRequests, headers),
      secondaryForbidden: () => this.secondaryLimit(STATUS.forbidden, headers),
    };
    return replies[outage]();
  }

  private secondaryLimit(status: number, headers: Headers): Response {
    headers.set(RETRY_AFTER, String(RETRY_AFTER_SECONDS));
    return this.replies.error(status, MESSAGE.secondaryLimit, DOCS_PAGE.rateLimits, headers);
  }

  private badCredentials(headers: Headers): Response {
    return this.replies.error(STATUS.unauthorized, MESSAGE.badCredentials, DOCS_PAGE.root, headers);
  }

  private rateLimited(headers: Headers): Response {
    const docs = DOCS_PAGE.rateLimits;
    return this.replies.error(STATUS.forbidden, MESSAGE.rateLimited, docs, headers);
  }

  private notFound(headers: Headers): Response {
    return this.replies.error(STATUS.notFound, MESSAGE.notFound, DOCS_PAGE.root, headers);
  }

  private rateLimitHeaders(): Headers {
    return new Headers({
      "x-ratelimit-limit": String(RATE_LIMIT),
      "x-ratelimit-remaining": String(Math.max(this.remaining - 1, 0)),
      "x-ratelimit-used": String(RATE_LIMIT - this.remaining + 1),
      "x-ratelimit-reset": String(RESET_EPOCH_SECONDS),
      "x-ratelimit-resource": CORE_RESOURCE,
    });
  }

  private seedBranches(): void {
    if (this.setup.empty) return;
    const files = new Map(
      Object.entries(this.setup.seed).map(([path, content]) => [path, this.store.addBlob(content)]),
    );
    const commit = this.store.addCommit(this.store.addTree(files), [], SEED_MESSAGE);
    this.setup.branches.forEach((branch) => this.store.setRef(branch, commit.sha));
  }
}
