import { Container } from "inversify";
import { D1_SEARCH_SYMBOLS } from "../../../src/adapters/outbound/d1-search/d1-search.symbols";
import { GITHUB } from "../../../src/adapters/outbound/github/github.symbols";
import { QUEUE } from "../../../src/adapters/outbound/queue/queue.symbols";
import { QueueNoteChanges } from "../../../src/application/use-cases/queue-note-changes";
import { ReconcileIndex } from "../../../src/application/use-cases/reconcile-index";
import { indexingModule } from "../../../src/main/indexing/indexing.container";
import { INDEXING } from "../../../src/main/indexing/indexing.symbols";
import { SpyPathQueue } from "../../application/use-cases/__spy__/spy-path-queue";
import { FixedNoteCatalog } from "../../application/use-cases/__stub__/fixed-note-catalog";

const PLAN = "projects/plan.md";
const VERSION = "1111111111111111111111111111111111111111";

let queue: SpyPathQueue;

function buildContainer(): Container {
  const container = new Container();
  container.bind(GITHUB.noteCatalog).toConstantValue(new FixedNoteCatalog({ [PLAN]: VERSION }));
  container.bind(D1_SEARCH_SYMBOLS.IndexManifest).toConstantValue(new FixedNoteCatalog({}));
  container.bind(QUEUE.pathQueue).toConstantValue(queue);
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

  it("binds the reconciliation", () => {
    const resolved = buildContainer().get(INDEXING.reconcile);

    expect(resolved).toBeInstanceOf(ReconcileIndex);
  });

  it("reconciles the repository against the index manifest into the path queue", async () => {
    await buildContainer().get(INDEXING.reconcile).execute();

    expect(queue.paths).toEqual([PLAN]);
  });
});
