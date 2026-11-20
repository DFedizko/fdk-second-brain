import type { FailureContext } from "./github-error-translator";
import type { GitHubAccess } from "./github-gateway";
import { RefAlreadyExists } from "./ref-already-exists";

const BRANCH_REF = "heads/";
const REFS_PREFIX = "refs/";
const BRANCH_LEVEL: FailureContext = {};

export interface BranchRestorer {
    restore(): Promise<void>;
}

export class GitHubBranchRestorer implements BranchRestorer {
    constructor(private readonly github: GitHubAccess) {}

    async restore(): Promise<void> {
        const head = await this.defaultBranchHead();
        await this.github
            .send(BRANCH_LEVEL, (client, repo) =>
                client.rest.git.createRef({ ...repo, ref: REFS_PREFIX + this.github.branchRef, sha: head }),
            )
            .catch((error: unknown) => this.acceptExistingRef(error));
    }

    private async defaultBranchHead(): Promise<string> {
        const { data: repository } = await this.github.send(BRANCH_LEVEL, (client, repo) =>
            client.rest.repos.get({ ...repo }),
        );
        const { data: ref } = await this.github.send(BRANCH_LEVEL, (client, repo) =>
            client.rest.git.getRef({ ...repo, ref: BRANCH_REF + repository.default_branch }),
        );
        return ref.object.sha;
    }

    private acceptExistingRef(error: unknown): void {
        if (!(error instanceof RefAlreadyExists)) throw error;
    }
}
