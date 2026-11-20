import { Container } from "inversify";
import { D1_SEARCH_SYMBOLS } from "../../../src/adapters/outbound/d1-search/d1-search.symbols";
import { GITHUB } from "../../../src/adapters/outbound/github/github.symbols";
import { QUEUE } from "../../../src/adapters/outbound/queue/queue.symbols";
import { DropNoteIndex } from "../../../src/application/use-cases/drop-note-index";
import { IndexPushedNote } from "../../../src/application/use-cases/index-pushed-note";
import { QueueNoteChanges } from "../../../src/application/use-cases/queue-note-changes";
import { ReconcileIndex } from "../../../src/application/use-cases/reconcile-index";
import { indexingModule } from "../../../src/main/indexing/indexing.container";
import { INDEXING } from "../../../src/main/indexing/indexing.symbols";
import { SEARCH } from "../../../src/main/search/search.symbols";
import { IndexNote } from "../../../src/application/use-cases/index-note";
import { MarkdownChunker } from "../../../src/domain/markdown-chunker";
import { InMemoryNoteRepo } from "../../application/__fake__/in-memory-note-repo";
import { InMemorySearchIndex } from "../../application/use-cases/__fake__/in-memory-search-index";
import { FixedBranchHead } from "../../application/use-cases/__stub__/fixed-branch-head";
import { SpyPathQueue } from "../../application/use-cases/__spy__/spy-path-queue";
import { FixedNoteCatalog } from "../../application/use-cases/__stub__/fixed-note-catalog";
import { FixedNoteTree } from "../../application/use-cases/__stub__/fixed-note-tree";

const PLAN = "projects/plan.md";
const VERSION = "1111111111111111111111111111111111111111";

let queue: SpyPathQueue;

function buildContainer(): Container {
  const container = new Container();
  container.bind(GITHUB.noteCatalog).toConstantValue(new FixedNoteTree({ [PLAN]: VERSION }));
  container.bind(D1_SEARCH_SYMBOLS.IndexManifest).toConstantValue(new FixedNoteCatalog({}));
  container.bind(QUEUE.pathQueue).toConstantValue(queue);
  container.bind(GITHUB.branchHead).toConstantValue(new FixedBranchHead(new InMemoryNoteRepo()));
  container.bind(D1_SEARCH_SYMBOLS.SearchIndex).toConstantValue(new InMemorySearchIndex());
  container.bind(SEARCH.chunker).toConstantValue(new MarkdownChunker());
  container
    .bind(SEARCH.indexNote)
    .toConstantValue(
      new IndexNote(new InMemorySearchIndex(), new InMemoryNoteRepo(), new MarkdownChunker()),
    );
  container.load(indexingModule);
  return container;
}

beforeEach(() => {
  queue = new SpyPathQueue();
});

describe("indexingModule", () => {
  it("binds the queueing of changed notes", () => {
    const resolved = buildContainer().get(INDEXING.queueChanges);

    expect(resolved).toBeInstanceOf(QueueNoteChanges);
  });

  it("binds the indexing of pushed notes", () => {
    const resolved = buildContainer().get(INDEXING.indexPushed);

    expect(resolved).toBeInstanceOf(IndexPushedNote);
  });

  it("binds the removal of a note that can never be read", () => {
    const resolved = buildContainer().get(INDEXING.dropIndex);

    expect(resolved).toBeInstanceOf(DropNoteIndex);
  });

  it("binds the reconciliation", () => {
    const resolved = buildContainer().get(INDEXING.reconcile);

    expect(resolved).toBeInstanceOf(ReconcileIndex);
  });

  it("reconciles the repository against the index manifest into the path queue", async () => {
    await buildContainer().get(INDEXING.reconcile).execute();

    expect(queue.paths).toEqual([PLAN]);
  });
});
