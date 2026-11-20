import { IndexPushedNote } from "../../../src/application/use-cases/index-pushed-note";
import { BranchBehind } from "../../../src/domain/errors/branch-behind";
import { InMemoryNoteRepo } from "../__fake__/in-memory-note-repo";
import { SpyIndexerFactory } from "./__spy__/spy-indexer-factory";
import { SpyNoteIndexer } from "./__spy__/spy-note-indexer";
import { FixedBranchHead } from "./__stub__/fixed-branch-head";

const PLAN = "projects/plan.md";
const COMMIT = "0d1a26e67d8f5eaf1f6ba5c57fc3c7d91ac0fd1c";

describe("IndexPushedNote", () => {
  let factory: SpyIndexerFactory;
  let atBranch: SpyNoteIndexer;

  beforeEach(() => {
    factory = new SpyIndexerFactory();
    atBranch = new SpyNoteIndexer();
  });

  it("re-indexes the path from the head commit it checked against the push", async () => {
    const pinned = new InMemoryNoteRepo();
    const useCase = new IndexPushedNote(new FixedBranchHead(pinned), factory, atBranch);

    await useCase.execute({ path: PLAN, commit: COMMIT });

    expect({ lookups: factory.lookups, indexed: factory.indexer.inputs }).toEqual({
      lookups: [pinned],
      indexed: [{ path: PLAN }],
    });
  });

  it("refuses to read a branch that has not reached the pushed commit yet", async () => {
    const useCase = new IndexPushedNote(new FixedBranchHead(null), factory, atBranch);

    const run = useCase.execute({ path: PLAN, commit: COMMIT });

    await expect(run).rejects.toThrow(BranchBehind);
  });

  it("leaves the index alone while the branch is behind", async () => {
    const useCase = new IndexPushedNote(new FixedBranchHead(null), factory, atBranch);

    await useCase.execute({ path: PLAN, commit: COMMIT }).catch(() => undefined);

    expect([...factory.indexer.inputs, ...atBranch.inputs]).toEqual([]);
  });

  it("re-indexes a path queued without a commit from the branch straight away", async () => {
    const head = new FixedBranchHead(null);

    await new IndexPushedNote(head, factory, atBranch).execute({ path: PLAN });

    expect({ asked: head.asked, indexed: atBranch.paths }).toEqual({ asked: [], indexed: [PLAN] });
  });
});
