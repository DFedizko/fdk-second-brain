import { IndexPushedNote } from "../../../src/application/use-cases/index-pushed-note";
import { BranchBehind } from "../../../src/domain/errors/branch-behind";
import { InMemoryNoteRepo } from "../__fake__/in-memory-note-repo";
import { SpyIndexerFactory } from "./__spy__/spy-indexer-factory";
import { FixedBranchHead } from "./__stub__/fixed-branch-head";

const PLAN = "projects/plan.md";
const COMMIT = "0d1a26e67d8f5eaf1f6ba5c57fc3c7d91ac0fd1c";

describe("IndexPushedNote", () => {
    let factory: SpyIndexerFactory;

    beforeEach(() => {
        factory = new SpyIndexerFactory();
    });

    it("re-indexes the path from the head commit it checked against the push", async () => {
        const pinned = new InMemoryNoteRepo();
        const useCase = new IndexPushedNote(new FixedBranchHead(pinned), factory);

        await useCase.execute({ path: PLAN, commit: COMMIT });

        expect({ lookups: factory.lookups, indexed: factory.indexer.inputs }).toEqual({
            lookups: [pinned],
            indexed: [{ path: PLAN }],
        });
    });

    it("refuses to read a branch that has not reached the pushed commit yet", async () => {
        const useCase = new IndexPushedNote(new FixedBranchHead(null), factory);

        const run = useCase.execute({ path: PLAN, commit: COMMIT });

        await expect(run).rejects.toThrow(BranchBehind);
    });

    it("leaves the index alone while the branch is behind", async () => {
        const useCase = new IndexPushedNote(new FixedBranchHead(null), factory);

        await useCase.execute({ path: PLAN, commit: COMMIT }).catch(() => undefined);

        expect(factory.indexer.inputs).toEqual([]);
    });

    it("re-indexes a path queued without a commit from the head it pinned", async () => {
        const head = new FixedBranchHead(null);

        await new IndexPushedNote(head, factory).execute({ path: PLAN });

        expect({ asked: head.asked, lookups: factory.lookups }).toEqual({
            asked: [],
            lookups: [head.atHead],
        });
    });
});
