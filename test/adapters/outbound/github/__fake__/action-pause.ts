import type { RetryPause } from "../../../../../src/adapters/outbound/github/retry-pause";

export class ActionPause implements RetryPause {
  constructor(private readonly action: () => void = () => undefined) {}

  async wait(): Promise<void> {
    this.action();
  }
}

export const NO_PAUSE = new ActionPause();
