const QUEUE_NAME = "second-brain-index";
const EMPTY_METRICS = { backlogCount: 0, backlogBytes: 0 };
const SENT_AT = new Date("2026-11-19T12:00:00Z");

export type Outcome = { readonly acked: true } | { readonly retryDelay: number | undefined };

export class FakeMessage implements Message<unknown> {
  readonly timestamp = SENT_AT;
  outcome?: Outcome;

  constructor(
    readonly id: string,
    readonly body: unknown,
    readonly attempts: number,
  ) {}

  ack(): void {
    this.outcome ??= { acked: true };
  }

  retry(options?: QueueRetryOptions): void {
    this.outcome ??= { retryDelay: options?.delaySeconds };
  }
}

export class FakeMessageBatch implements MessageBatch<unknown> {
  readonly queue = QUEUE_NAME;
  readonly metadata = { metrics: EMPTY_METRICS };

  constructor(readonly messages: readonly FakeMessage[]) {}

  static of(bodies: readonly unknown[], attempts = 1): FakeMessageBatch {
    return new FakeMessageBatch(
      bodies.map((body, place) => new FakeMessage(String(place), body, attempts)),
    );
  }

  retryAll(options?: QueueRetryOptions): void {
    this.messages.forEach((message) => message.retry(options));
  }

  ackAll(): void {
    this.messages.forEach((message) => message.ack());
  }

  outcomes(): (Outcome | undefined)[] {
    return this.messages.map((message) => message.outcome);
  }
}
