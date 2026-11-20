import { QueueNoteChanges } from "../../../src/application/use-cases/queue-note-changes";
import { SpyPathQueue } from "./__spy__/spy-path-queue";

const PLAN = "projects/plan.md";
const IDEA = "ideas/idea.md";
const IMAGE = "assets/photo.png";
const HIDDEN = ".obsidian/workspace.md";

describe("QueueNoteChanges", () => {
  let queue: SpyPathQueue;
  let queueChanges: QueueNoteChanges;

  beforeEach(() => {
    queue = new SpyPathQueue();
    queueChanges = new QueueNoteChanges(queue);
  });

  it("queues every changed note path", async () => {
    await queueChanges.execute({ paths: [PLAN, IDEA] });

    expect(queue.paths).toEqual([PLAN, IDEA]);
  });

  it("queues a path changed twice only once", async () => {
    await queueChanges.execute({ paths: [PLAN, IDEA, PLAN] });

    expect(queue.paths).toEqual([PLAN, IDEA]);
  });

  it("skips files that are not notes", async () => {
    await queueChanges.execute({ paths: [IMAGE, PLAN, HIDDEN] });

    expect(queue.paths).toEqual([PLAN]);
  });

  it("sends nothing when no note changed", async () => {
    await queueChanges.execute({ paths: [IMAGE] });

    expect(queue.batches).toEqual([]);
  });

  it("tells how many notes were queued", async () => {
    const result = await queueChanges.execute({ paths: [PLAN, IMAGE, IDEA] });

    expect(result).toEqual({ queued: 2 });
  });
});
