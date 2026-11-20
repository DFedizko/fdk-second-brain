import type {
  BackgroundTask,
  BackgroundTasks,
} from "../../../../src/application/ports/background-tasks";

export class ManualBackgroundTasks implements BackgroundTasks {
  private queued: BackgroundTask[] = [];

  runInBackground(task: BackgroundTask): void {
    this.queued.push(task);
  }

  async runQueued(): Promise<void> {
    const tasks = this.queued;
    this.queued = [];
    await Promise.all(tasks.map((task) => task()));
  }
}
