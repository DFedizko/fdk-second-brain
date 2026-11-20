import { FixedClock } from "../../__stub__/fixed-clock";
import { IndexQueueConsumer } from "../../../src/adapters/inbound/queue/index-queue-consumer";
import { ReconcileIndex } from "../../../src/application/use-cases/reconcile-index";
import { NotePath } from "../../../src/domain/note-path";
import { FakeMessageBatch } from "../../adapters/inbound/queue/__fake__/fake-message-batch";
import { LocalRuntime } from "../../shared/adapters/local-runtime";
import { InMemoryNoteCatalog } from "../__fake__/in-memory-note-catalog";
import { SpyPathQueue } from "./__spy__/spy-path-queue";
import { StaleIndexRace } from "./stale-index-race";

const NOW = new Date("2026-11-20T12:00:00Z");
const PLAN = "projects/plan.md";
const IDEA = "ideas/idea.md";
const PLAN_CONTENT = "# Plan\n\nShip the nebula release.\n";
const IDEA_CONTENT = "# Idea\n\nGrow the quasar garden.\n";

describe("ReconcileIndex on D1", () => {
  let runtime: LocalRuntime | undefined;
  let race: StaleIndexRace;
  let queue: SpyPathQueue;
  let reconcile: ReconcileIndex;

  beforeEach(async () => {
    runtime = await LocalRuntime.start();
    await runtime.migrate();
    race = await StaleIndexRace.on(runtime);
    queue = new SpyPathQueue();
    reconcile = new ReconcileIndex(new InMemoryNoteCatalog(race.notes), race.manifest, queue);
  });

  afterEach(async () => {
    await runtime?.stop();
    runtime = undefined;
  });

  async function consumeQueued(): Promise<void> {
    const bodies = queue.paths.map((path) => ({ path }));
    await new IndexQueueConsumer(race.indexer, race.log, new FixedClock(NOW)).handle(
      FakeMessageBatch.of(bodies),
    );
  }

  it("queues a note written then deleted within moments that stayed in search", async () => {
    await race.writeThenDelete(PLAN, PLAN_CONTENT);

    await reconcile.execute();

    expect(queue.paths).toEqual([PLAN]);
  });

  it("removes that note from search once its fix is consumed", async () => {
    await race.writeThenDelete(PLAN, PLAN_CONTENT);
    await reconcile.execute();

    await consumeQueued();

    expect(await race.searchPaths("nebula")).toEqual([]);
  });

  it("indexes a note the index never saw", async () => {
    await race.notes.create(NotePath.of(IDEA), IDEA_CONTENT);
    await reconcile.execute();

    await consumeQueued();

    expect(await race.searchPaths("quasar")).toEqual([IDEA]);
  });

  it("finds nothing to fix once the index matches the repository", async () => {
    await race.notes.create(NotePath.of(IDEA), IDEA_CONTENT);
    await reconcile.execute();
    await consumeQueued();

    const result = await reconcile.execute();

    expect(result).toEqual({ missing: 0, stale: 0, orphaned: 0 });
  });
});
