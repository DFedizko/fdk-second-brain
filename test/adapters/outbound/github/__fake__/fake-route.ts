import type { FakeGitStore } from "./fake-git-store";
import type { GitHubReplies } from "./github-replies";
import type { GitHubShapes } from "./github-shapes";

export interface FakeCall {
    readonly params: readonly string[];
    readonly query: URLSearchParams;
    readonly body: Record<string, unknown>;
    readonly headers: Headers;
}

export interface FakeRoute {
    readonly method: string;
    readonly pattern: RegExp;
    reply(call: FakeCall): Response;
}

export interface FakeLimits {
    truncateTrees: boolean;
}

export interface FakeRepoParts {
    readonly store: FakeGitStore;
    readonly shapes: GitHubShapes;
    readonly replies: GitHubReplies;
    readonly defaultBranch: string;
    readonly limits: FakeLimits;
}
