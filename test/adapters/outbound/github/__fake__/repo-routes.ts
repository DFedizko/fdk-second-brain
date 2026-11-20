import type { FakeCall, FakeRepoParts, FakeRoute } from "./fake-route";
import { STATUS } from "./github-replies";

const REPO_ROOT = /^$/;

export class RepoRoutes {
    constructor(private readonly parts: FakeRepoParts) {}

    all(): FakeRoute[] {
        return [{ method: "GET", pattern: REPO_ROOT, reply: (call) => this.getRepo(call) }];
    }

    private getRepo(call: FakeCall): Response {
        const repository = this.parts.shapes.repository(this.parts.defaultBranch);
        return this.parts.replies.json(STATUS.ok, repository, call.headers);
    }
}
