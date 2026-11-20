import { IndexPushedNote } from "../../../src/application/use-cases/index-pushed-note";
import { BranchBehind } from "../../../src/domain/errors/branch-behind";
import { SpyNoteIndexer } from "./__spy__/spy-note-indexer";
import { FixedBranchHead } from "./__stub__/fixed-branch-head";

const PLAN = "projects/plan.md";
const COMMIT = "0d1a26e67d8f5eaf1f6ba5c57fc3c7d91ac0fd1c";

describe("IndexPushedNote", () => {
  it("re-indexes the path from the head once the branch has reached the pushed commit", async () => {
    const indexer = new SpyNoteIndexer();
    const useCase = new IndexPushedNote(new FixedBranchHead(true), indexer);

    await useCase.execute({ path: PLAN, commit: COMMIT });

    expect(indexer.inputs).toEqual([{ path: PLAN }]);
  });

  it("refuses to read a branch that has not reached the pushed commit yet", async () => {
    const indexer = new SpyNoteIndexer();
    const useCase = new IndexPushedNote(new FixedBranchHead(false), indexer);

    const run = useCase.execute({ path: PLAN, commit: COMMIT });

    await expect(run).rejects.toThrow(BranchBehind);
  });

  it("leaves the index alone while the branch is behind", async () => {
    const indexer = new SpyNoteIndexer();
    const useCase = new IndexPushedNote(new FixedBranchHead(false), indexer);

    await useCase.execute({ path: PLAN, commit: COMMIT }).catch(() => undefined);

    expect(indexer.inputs).toEqual([]);
  });

  it("re-indexes a path queued without a commit straight away", async () => {
    const head = new FixedBranchHead(false);
    const indexer = new SpyNoteIndexer();

    await new IndexPushedNote(head, indexer).execute({ path: PLAN });

    expect({ asked: head.asked, indexed: indexer.paths }).toEqual({ asked: [], indexed: [PLAN] });
  });
});
