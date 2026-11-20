import { Octokit } from "@octokit/rest";
import { SILENT_LOG } from "../../../../../src/adapters/outbound/github/silent-log";
import { CompareRoutes } from "./compare-routes";
import { EmptyRepoReplies } from "./empty-repo-replies";
import { ContentsRoutes } from "./contents-routes";
import { FakeGitStore } from "./fake-git-store";
import { FirstCommitRaces, type FakeFiles } from "./first-commit-races";
import type { FakeLimits, FakeRepoParts, FakeRoute } from "./fake-route";
import { GitDataRoutes } from "./git-data-routes";
import { RepoRoutes } from "./repo-routes";
import { DOCS_PAGE, GitHubReplies, MESSAGE, STATUS } from "./github-replies";
import { GitHubShapes } from "./github-shapes";

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
const CONTENTS = /^contents\//;
const ADD_MESSAGE = "Add";
const ROOT_ROUTE = "";

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
    private readonly races = new FirstCommitRaces(this.store);
    private readonly empty: EmptyRepoReplies;
    private readonly limits: FakeLimits = { truncateTrees: false };
    readonly served: number[] = [];
    readonly requested: string[] = [];

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
        const repoPath = `${setup.owner}${SEPARATOR}${setup.repo}`;
        this.empty = new EmptyRepoReplies(this.store, this.replies);
        this.routes = [
            ...new RepoRoutes(parts).all(),
            ...new ContentsRoutes(parts).all(),
            ...new GitDataRoutes(parts).all(),
            ...new CompareRoutes(parts, repoPath).all(),
        ];
        this.seedBranches();
    }

    readonly fetch = async (input: string | URL | Request, init?: RequestInit) => {
        const request = new Request(input, init);
        if (this.outage === "network") throw new TypeError(NETWORK_FAILURE);
        const body: Record<string, unknown> = request.body ? await request.json() : {};
        const step = { method: request.method, path: new URL(request.url).pathname, body };
        this.races.beforeRequest(step);
        const response = this.answer(request, body);
        this.races.afterReply({ ...step, status: response.status });
        this.served.push(response.status);
        this.requested.push(`${step.method} ${step.path}`);
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
        const sha = typeof target === "string" && mode === SUBMODULE_MODE ? target : this.store.addBlob(target);
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

    get raceOnce(): FirstCommitRaces {
        return this.races;
    }

    seedAllBranches(seed: FakeFiles): void {
        const commit = this.store.addCommit(this.store.addTree(this.blobsOf(seed)), [], SEED_MESSAGE);
        this.setup.branches.forEach((branch) => this.store.setRef(branch, commit.sha));
    }

    commitFiles(branch: string, added: FakeFiles): void {
        const files = new Map([...(this.store.filesAt(branch) ?? []), ...this.blobsOf(added)]);
        this.store.advance(branch, files, `${ADD_MESSAGE} ${Object.keys(added).join(" ")}`);
    }

    rejectBranchWritesAsEmpty(): void {
        this.empty.rejectBranchWrites();
    }

    lagRefReadsAsEmpty(times: number): void {
        this.empty.lagRefReads(times);
    }

    endOutage(): void {
        this.outage = undefined;
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
        const call = { method: request.method, route, body, headers };
        const empty = this.empty.answer(call, () => this.dispatch(request, route, body, headers));
        if (empty) return empty;
        this.raceRefUpdate(request.method, route);
        const raced = this.raceFileWrite(request.method, route, body, headers);
        return raced ?? this.dispatch(request, route, body, headers);
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
        const after = this.store.advance(branch, this.store.filesAt(branch) ?? new Map(), RACING_MESSAGE);
        const message = `${branch} is at ${after.sha} but expected ${before}`;
        return this.replies.error(STATUS.conflict, message, DOCS_PAGE.contents, headers);
    }

    private routeOf(url: URL): string | undefined {
        const repoPath = `${API_PREFIX}${this.setup.owner}${SEPARATOR}${this.setup.repo}`;
        if (url.pathname === repoPath) return ROOT_ROUTE;
        if (!url.pathname.startsWith(repoPath + SEPARATOR)) return undefined;
        return decodeURIComponent(url.pathname.slice(repoPath.length + SEPARATOR.length));
    }

    private isAuthorized(request: Request): boolean {
        const [scheme, token] = (request.headers.get(AUTHORIZATION) ?? "").split(" ");
        const known = AUTH_SCHEMES.includes(scheme?.toLowerCase() ?? "") && token === this.setup.token;
        return known && !this.tokenRevoked;
    }

    private outageReply(outage: HttpOutage, headers: Headers): Response {
        const replies: Record<HttpOutage, () => Response> = {
            forbidden: () => this.replies.error(STATUS.forbidden, MESSAGE.noPermission, DOCS_PAGE.root, headers),
            server: () => this.replies.error(STATUS.serverError, MESSAGE.serverError, DOCS_PAGE.root, headers),
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
        this.seedAllBranches(this.setup.seed);
    }

    private blobsOf(files: FakeFiles): Map<string, string> {
        return new Map(Object.entries(files).map(([path, content]) => [path, this.store.addBlob(content)]));
    }
}
