import { Container } from "inversify";
import { backgroundModule } from "../../../../src/adapters/outbound/background/background.container";
import { BACKGROUND } from "../../../../src/adapters/outbound/background/background.symbols";
import { KEPT_ALIVE } from "../../../shared/adapters/workers-module-shim";
import { WaitUntilTasks } from "../../../../src/adapters/outbound/background/wait-until-tasks";

describe("backgroundModule", () => {
  it("binds background tasks to the Worker's waitUntil", () => {
    const container = new Container();
    container.load(backgroundModule);

    const tasks = container.get(BACKGROUND.tasks);

    expect(tasks).toBeInstanceOf(WaitUntilTasks);
  });

  it("keeps the Worker alive with the request's waitUntil", () => {
    const container = new Container();
    container.load(backgroundModule);
    const done = Promise.resolve();

    container.get(BACKGROUND.tasks).runInBackground(() => done);

    expect(KEPT_ALIVE).toContain(done);
  });
});
