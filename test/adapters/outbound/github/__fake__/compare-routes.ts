import type { FakeCall, FakeRepoParts, FakeRoute } from "./fake-route";
import { DOCS_PAGE, MESSAGE, STATUS } from "./github-replies";

const COMPARE = /^compare\/([^.]+)\.\.\.(.+)$/;
const API_ROOT = "https://api.github.com/repos/";
const WEB_ROOT = "https://github.com/";

type CompareStatus = "identical" | "ahead" | "behind" | "diverged";

export class CompareRoutes {
    constructor(
        private readonly parts: FakeRepoParts,
        private readonly repoPath: string,
    ) {}

    all(): FakeRoute[] {
        return [{ method: "GET", pattern: COMPARE, reply: (call) => this.compare(call) }];
    }

    private compare(call: FakeCall): Response {
        const [baseRef = "", headRef = ""] = call.params;
        const base = this.parts.store.resolveCommit(baseRef)?.sha;
        const head = this.parts.store.resolveCommit(headRef)?.sha;
        if (!base || !head) {
            return this.parts.replies.error(STATUS.notFound, MESSAGE.notFound, DOCS_PAGE.compare, call.headers);
        }
        const aheadBy = this.countUntil(head, base);
        const behindBy = this.countUntil(base, head);
        const body = {
            url: `${API_ROOT}${this.repoPath}/compare/${baseRef}...${headRef}`,
            html_url: `${WEB_ROOT}${this.repoPath}/compare/${baseRef}...${headRef}`,
            status: this.statusOf(base, head),
            ahead_by: aheadBy,
            behind_by: behindBy,
            total_commits: aheadBy,
            commits: [],
            files: [],
        };
        return this.parts.replies.json(STATUS.ok, body, call.headers);
    }

    private statusOf(base: string, head: string): CompareStatus {
        if (base === head) return "identical";
        if (this.descendsFrom(head, base)) return "ahead";
        if (this.descendsFrom(base, head)) return "behind";
        return "diverged";
    }

    private descendsFrom(commit: string, ancestor: string): boolean {
        return this.parts.store.history(commit).some((entry) => entry.sha === ancestor);
    }

    private countUntil(from: string, ancestor: string): number {
        const history = this.parts.store.history(from).map((entry) => entry.sha);
        const place = history.indexOf(ancestor);
        return place < 0 ? history.length : place;
    }
}
