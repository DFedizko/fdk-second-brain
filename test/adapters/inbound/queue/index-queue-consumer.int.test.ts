import { IndexQueueConsumer } from "../../../../src/adapters/inbound/queue/index-queue-consumer";
import { NotePath } from "../../../../src/domain/note-path";
import { StaleIndexRace } from "../../../application/use-cases/stale-index-race";
import { LocalRuntime } from "../../../shared/adapters/local-runtime";
import { FakeMessageBatch } from "./__fake__/fake-message-batch";

const PLAN = "projects/plan.md";
const IDEA = "ideas/idea.md";
const PLAN_CONTENT = "# Plan\n\nShip the nebula release.\n";
const IDEA_CONTENT = "# Idea\n\nGrow the quasar garden.\n";
const EDITED_IDEA = "# Idea\n\nGrow the pulsar garden.\n";

describe("IndexQueueConsumer on D1", () => {
  let runtime: LocalRuntime | undefined;
  let race: StaleIndexRace;
  let consumer: IndexQueueConsumer;

  beforeEach(async () => {
    runtime = await LocalRuntime.start();
    await runtime.migrate();
    race = await StaleIndexRace.on(runtime);
    consumer = new IndexQueueConsumer(race.indexer, race.log);
  });

  afterEach(async () => {
    await runtime?.stop();
    runtime = undefined;
  });

  it("reproduces a deleted note left in search by indexing out of order", async () => {
    await race.writeThenDelete(PLAN, PLAN_CONTENT);

    const found = await race.searchPaths("nebula");

    expect(found).toEqual([PLAN]);
  });

  it("removes a note written then deleted within moments once the webhook runs", async () => {
    await race.writeThenDelete(PLAN, PLAN_CONTENT);

    await consumer.handle(FakeMessageBatch.of([{ path: PLAN }]));

    expect(await race.searchPaths("nebula")).toEqual([]);
  });

  it("indexes a note added outside the server", async () => {
    await race.notes.create(NotePath.of(IDEA), IDEA_CONTENT);

    await consumer.handle(FakeMessageBatch.of([{ path: IDEA }]));

    expect(await race.searchPaths("quasar")).toEqual([IDEA]);
  });

  it("indexes the latest content even when the message is about an older change", async () => {
    const created = await race.notes.create(NotePath.of(IDEA), IDEA_CONTENT);
    await race.notes.write(NotePath.of(IDEA), EDITED_IDEA, created.version);

    await consumer.handle(FakeMessageBatch.of([{ path: IDEA }]));

    expect(await race.searchPaths("pulsar quasar")).toEqual([IDEA]);
  });

  it("acknowledges each message once its path is in sync", async () => {
    await race.notes.create(NotePath.of(IDEA), IDEA_CONTENT);
    const batch = FakeMessageBatch.of([{ path: IDEA }, { path: PLAN }]);

    await consumer.handle(batch);

    expect(batch.outcomes()).toEqual([{ acked: true }, { acked: true }]);
  });
});
