import { ReconcileIndex } from "../../../src/application/use-cases/reconcile-index";
import { SpyPathQueue } from "./__spy__/spy-path-queue";
import { FixedNoteCatalog } from "./__stub__/fixed-note-catalog";

const PLAN = "projects/plan.md";
const IDEA = "ideas/idea.md";
const OLD = "archive/old.md";
const FIRST = "1111111111111111111111111111111111111111";
const SECOND = "2222222222222222222222222222222222222222";

function reconcile(repo: Record<string, string>, index: Record<string, string>) {
  const queue = new SpyPathQueue();
  const useCase = new ReconcileIndex(
    new FixedNoteCatalog(repo),
    new FixedNoteCatalog(index),
    queue,
  );
  return { queue, useCase };
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
    const { useCase } = reconcile(
      { [PLAN]: SECOND, [IDEA]: FIRST },
      { [PLAN]: FIRST, [OLD]: FIRST },
    );

    const result = await useCase.execute();

    expect(result).toEqual({ missing: 1, stale: 1, orphaned: 1 });
  });

  it("queues all fixes together", async () => {
    const { queue, useCase } = reconcile(
      { [PLAN]: SECOND, [IDEA]: FIRST },
      { [PLAN]: FIRST, [OLD]: FIRST },
    );

    await useCase.execute();

    expect(queue.batches).toEqual([[IDEA, PLAN, OLD]]);
  });
});
