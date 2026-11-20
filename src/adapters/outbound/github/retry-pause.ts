export interface RetryPause {
    wait(millis: number): Promise<void>;
}

export class TimerPause implements RetryPause {
    async wait(millis: number): Promise<void> {
        await new Promise<void>((resolve) => setTimeout(resolve, millis));
    }
}
