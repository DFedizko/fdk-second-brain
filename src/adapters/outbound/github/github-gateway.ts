import type { Octokit } from "@octokit/rest";
import type { GitHubConfig } from "./github-config";
import type { FailureContext, GitHubErrorMapper } from "./github-error-translator";

const BRANCH_REF = "heads/";

export interface RepoCoordinates {
    readonly owner: string;
    readonly repo: string;
}

export type GitHubRequest<T> = (client: Octokit, repo: RepoCoordinates) => Promise<T>;

export interface GitHubAccess {
    readonly branch: string;
    readonly branchRef: string;
    send<T>(context: FailureContext, request: GitHubRequest<T>): Promise<T>;
}

export class GitHubGateway implements GitHubAccess {
    constructor(
        private readonly client: Octokit,
        private readonly config: GitHubConfig,
        private readonly errors: GitHubErrorMapper,
    ) {}

    get branch(): string {
        return this.config.branch;
    }

    get branchRef(): string {
        return BRANCH_REF + this.config.branch;
    }

    async send<T>(context: FailureContext, request: GitHubRequest<T>): Promise<T> {
        const repo = { owner: this.config.owner, repo: this.config.repo };
        return request(this.client, repo).catch((error: unknown) => {
            throw this.errors.toDomainError(error, context);
        });
    }
}
