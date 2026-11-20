import type { FakeGitStore } from "./fake-git-store";
import { STATUS } from "./github-replies";

const PUT = "PUT";
const POST = "POST";
const REFS = /\/git\/refs$/;

export type FakeFiles = Readonly<Record<string, string>>;
export type RaceAction = () => void;

interface RaceStep {
    readonly method: string;
    readonly path: string;
    readonly body: Record<string, unknown>;
    readonly status?: number;
}

type RaceTrigger = (step: RaceStep) => boolean;

export class FirstCommitRaces {
    private readonly before = new Map<RaceTrigger, RaceAction>();
    private readonly after = new Map<RaceTrigger, RaceAction>();

    constructor(private readonly store: FakeGitStore) {}

    beforeFirstCommit(action: RaceAction): void {
        this.before.set((step) => this.isUnbranchedPut(step) && !this.store.hasRefs(), action);
    }

    beforeRefCreate(action: RaceAction): void {
        this.before.set((step) => step.method === POST && REFS.test(step.path), action);
    }

    afterUnbranchedPut(action: RaceAction): void {
        this.after.set((step) => this.isUnbranchedPut(step) && step.status === STATUS.created, action);
    }

    afterBranchMiss(action: RaceAction): void {
        this.after.set((step) => step.method === PUT && step.status === STATUS.notFound, action);
    }

    beforeRequest(step: RaceStep): void {
        this.runMatching(this.before, step);
    }

    afterReply(step: RaceStep): void {
        this.runMatching(this.after, step);
    }

    private runMatching(actions: Map<RaceTrigger, RaceAction>, step: RaceStep): void {
        [...actions]
            .filter(([trigger]) => trigger(step))
            .forEach(([trigger, action]) => {
                actions.delete(trigger);
                action();
            });
    }

    private isUnbranchedPut(step: RaceStep): boolean {
        return step.method === PUT && step.body.branch === undefined;
    }
}
