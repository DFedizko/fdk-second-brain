import { WaitUntilTasks } from "../../../../src/adapters/outbound/background/wait-until-tasks";

describe("WaitUntilTasks", () => {
  let kept: Promise<unknown>[];
  let tasks: WaitUntilTasks;

  beforeEach(() => {
    kept = [];
    tasks = new WaitUntilTasks((promise) => {
      kept.push(promise);
    });
  });

  it("starts the task right away", () => {
    let started = false;

    tasks.runInBackground(async () => {
      started = true;
    });

    expect(started).toBe(true);
  });

  it("keeps the Worker alive until the task settles", async () => {
    const finished = Promise.resolve();

    tasks.runInBackground(() => finished);

    expect(kept).toEqual([finished]);
  });
});
