import { ReconcileIndex } from "../../../src/application/use-cases/reconcile-index";
import { SpyPathQueue } from "./__spy__/spy-path-queue";
import { FixedNoteCatalog } from "./__stub__/fixed-note-catalog";
import { FixedNoteTree } from "./__stub__/fixed-note-tree";

const PLAN = "projects/plan.md";
const IDEA = "ideas/idea.md";
const OLD = "archive/old.md";
const FIRST = "1111111111111111111111111111111111111111";
const SECOND = "2222222222222222222222222222222222222222";
const HEAD = "0d1a26e67d8f5eaf1f6ba5c57fc3c7d91ac0fd1c";

function reconcile(repo: Record<string, string>, index: Record<string, string>) {
    const queue = new SpyPathQueue();
    const tree = new FixedNoteTree(repo, HEAD);
    const useCase = new ReconcileIndex(tree, new FixedNoteCatalog(index), queue);
    return { queue, tree, useCase };
}

describe("ReconcileIndex", () => {
    it("queues a note missing from the index", async () => {
        const { queue, useCase } = reconcile({ [PLAN]: FIRST }, {});

        await useCase.execute();

        expect(queue.paths).toEqual([PLAN]);
    });

    it("queues a note whose indexed version is stale", async () => {
        const { queue, useCase } = reconcile({ [PLAN]: SECOND }, { [PLAN]: FIRST });

        await useCase.execute();

        expect(queue.paths).toEqual([PLAN]);
    });

    it("queues an indexed note that is gone from the repository", async () => {
        const { queue, useCase } = reconcile({}, { [OLD]: FIRST });

        await useCase.execute();

        expect(queue.paths).toEqual([OLD]);
    });

    it("leaves notes already indexed at their version alone", async () => {
        const { queue, useCase } = reconcile({ [PLAN]: FIRST }, { [PLAN]: FIRST });

        await useCase.execute();

        expect(queue.batches).toEqual([]);
    });

    it("counts each kind of fix it queued", async () => {
        const { useCase } = reconcile({ [PLAN]: SECOND, [IDEA]: FIRST }, { [PLAN]: FIRST, [OLD]: FIRST });

        const result = await useCase.execute();

        expect(result).toEqual({ missing: 1, stale: 1, orphaned: 1 });
    });

    it("queues all fixes together", async () => {
        const { queue, useCase } = reconcile({ [PLAN]: SECOND, [IDEA]: FIRST }, { [PLAN]: FIRST, [OLD]: FIRST });

        await useCase.execute();

        expect(queue.batches).toEqual([[IDEA, PLAN, OLD]]);
    });

    it("tags every queued path with the head commit it read the notes at", async () => {
        const { queue, useCase } = reconcile({ [PLAN]: SECOND }, { [OLD]: FIRST });

        await useCase.execute();

        expect(queue.commits).toEqual([HEAD]);
    });

    it("reads the notes at a head that includes the pushed commit it was given", async () => {
        const { tree, useCase } = reconcile({}, {});

        await useCase.execute(HEAD);

        expect(tree.asked).toEqual([HEAD]);
    });
});
