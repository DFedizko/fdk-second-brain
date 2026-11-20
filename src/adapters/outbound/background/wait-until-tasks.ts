import type { BackgroundTask, BackgroundTasks } from "../../../application/ports/background-tasks";

export type KeepAlive = (promise: Promise<unknown>) => void;

export class WaitUntilTasks implements BackgroundTasks {
  constructor(private readonly keepAlive: KeepAlive) {}

  runInBackground(task: BackgroundTask): void {
    this.keepAlive(task());
  }
}
