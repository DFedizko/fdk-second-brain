export type BackgroundTask = () => Promise<void>;

export interface BackgroundTasks {
    runInBackground(task: BackgroundTask): void;
}
