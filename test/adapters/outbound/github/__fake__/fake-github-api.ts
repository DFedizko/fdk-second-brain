import { Octokit } from "@octokit/rest";
import { ContentsRoutes } from "./contents-routes";
import { FakeGitStore } from "./fake-git-store";
import type { FakeRepoParts, FakeRoute } from "./fake-route";
import { GitDataRoutes } from "./git-data-routes";
import { DOCS_PAGE, GitHubReplies, MESSAGE, STATUS } from "./github-replies";
import { GitHubShapes } from "./github-shapes";

// Built from https://docs.github.com/en/rest/repos/contents, /git/refs, /git/trees,
// /git/commits and /using-the-rest-api/rate-limits-for-the-rest-api, checked 2026-11-19.

export interface FakeRepoSetup {
  readonly owner: string;
  readonly repo: string;
  readonly token: string;
  readonly branches: readonly string[];
  readonly seed: Readonly<Record<string, string>>;
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

type Outage = "secondary" | "forbidden" | "server" | "network";

export class FakeGitHubApi {
  readonly store = new FakeGitStore();
  private readonly replies = new GitHubReplies();
  private readonly routes: FakeRoute[];
  private remaining = RATE_LIMIT;
  private outage?: Outage;

  constructor(private readonly setup: FakeRepoSetup) {
    const shapes = new GitHubShapes(setup.owner, setup.repo);
    const defaultBranch = setup.branches[0] ?? "";
    const parts: FakeRepoParts = { store: this.store, shapes, replies: this.replies, defaultBranch };
    this.routes = [...new ContentsRoutes(parts).all(), ...new GitDataRoutes(parts).all()];
    this.seedBranches();
  }

  readonly fetch = async (input: string | URL | Request, init?: RequestInit) => {
    const request = new Request(input, init);
    if (this.outage === "network") throw new TypeError(NETWORK_FAILURE);
    const body = request.body ? await request.json() : {};
    return this.answer(request, body as Record<string, unknown>);
  };

  octokit(token: string): Octokit {
    return new Octokit({ auth: token, request: { fetch: this.fetch } });
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

  private answer(request: Request, body: Record<string, unknown>): Response {
    const headers = this.rateLimitHeaders();
    const route = this.routeOf(new URL(request.url));
    if (!this.isAuthorized(request)) return this.badCredentials(headers);
    if (this.remaining <= 0) return this.rateLimited(headers);
    this.remaining -= 1;
    if (this.outage && this.outage !== "network") return this.outageReply(this.outage, headers);
    if (route === undefined) return this.notFound(headers);
    return this.dispatch(request, route, body, headers);
  }

  private dispatch(request: Request, route: string, body: Record<string, unknown>, headers: Headers) {
    const query = new URL(request.url).searchParams;
    const match = this.routes
      .filter((candidate) => candidate.method === request.method)
      .map((candidate) => ({ candidate, params: candidate.pattern.exec(route) }))
      .find((found) => found.params);
    if (!match?.params) return this.notFound(headers);
    const params = match.params.slice(1);
    return match.candidate.reply({ params, query, body, headers });
  }

  private routeOf(url: URL): string | undefined {
    const repoPrefix = `${API_PREFIX}${this.setup.owner}${SEPARATOR}${this.setup.repo}${SEPARATOR}`;
    if (!url.pathname.startsWith(repoPrefix)) return undefined;
    return url.pathname.slice(repoPrefix.length);
  }

  private isAuthorized(request: Request): boolean {
    const [scheme, token] = (request.headers.get("authorization") ?? "").split(" ");
    return AUTH_SCHEMES.includes(scheme?.toLowerCase() ?? "") && token === this.setup.token;
  }

  private outageReply(outage: Exclude<Outage, "network">, headers: Headers): Response {
    if (outage === "forbidden") {
      return this.replies.error(STATUS.forbidden, MESSAGE.noPermission, DOCS_PAGE.root, headers);
    }
    if (outage === "server") {
      return this.replies.error(STATUS.serverError, MESSAGE.serverError, DOCS_PAGE.root, headers);
    }
    headers.set("retry-after", String(RETRY_AFTER_SECONDS));
    const docs = DOCS_PAGE.rateLimits;
    return this.replies.error(STATUS.tooManyRequests, MESSAGE.secondaryLimit, docs, headers);
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
    const files = new Map(
      Object.entries(this.setup.seed).map(([path, content]) => [path, this.store.addBlob(content)]),
    );
    const commit = this.store.addCommit(this.store.addTree(files), [], SEED_MESSAGE);
    this.setup.branches.forEach((branch) => this.store.setRef(branch, commit.sha));
  }
}
