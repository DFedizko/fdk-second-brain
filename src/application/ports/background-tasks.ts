export type BackgroundTask = () => Promise<void>;

export interface BackgroundTasks {
  runAfterReply(task: BackgroundTask): void;
}
