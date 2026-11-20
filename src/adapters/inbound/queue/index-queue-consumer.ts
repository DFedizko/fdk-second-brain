import type { IndexFailureLog } from "../../../application/ports/index-failure-log";
import type { NoteIndexer } from "../../../application/use-cases/index-note";
import { InvalidPath } from "../../../domain/errors/invalid-path";
import { NotesRateLimited } from "../../../domain/errors/notes-rate-limited";
import { z } from "zod";

export const RETRY_DELAY_SECONDS = 30;
export const MAX_RETRY_DELAY_SECONDS = 3600;
const BACKOFF_FACTOR = 2;
const FIRST_ATTEMPT = 1;
const UNREADABLE_LABEL = "queue message ";

const MESSAGE_SCHEMA = z.object({ path: z.string() });

class UnreadableMessage extends Error {
  override readonly name = "UnreadableMessage";
}

// Each path is re-read at the head of the branch, never taken from the push, so
// messages handled late or out of order still leave the index matching the repo.
export class IndexQueueConsumer {
  constructor(
    private readonly indexer: NoteIndexer,
    private readonly log: IndexFailureLog,
  ) {}

  async handle(batch: MessageBatch<unknown>): Promise<void> {
    await Promise.all(batch.messages.map((message) => this.process(message)));
  }

  private async process(message: Message<unknown>): Promise<void> {
    const parsed = MESSAGE_SCHEMA.safeParse(message.body);
    if (!parsed.success) return this.dropUnreadable(message);
    const path = parsed.data.path;
    await this.indexer.execute({ path }).then(
      () => message.ack(),
      (error: unknown) => this.handleFailure(message, path, error),
    );
  }

  private dropUnreadable(message: Message<unknown>): void {
    this.log.report({ path: UNREADABLE_LABEL + message.id, error: new UnreadableMessage() });
    message.ack();
  }

  private handleFailure(message: Message<unknown>, path: string, error: unknown): void {
    this.log.report({ path, error });
    if (error instanceof InvalidPath) return message.ack();
    message.retry({ delaySeconds: this.retryDelay(message.attempts, error) });
  }

  private retryDelay(attempts: number, error: unknown): number {
    if (error instanceof NotesRateLimited && error.retryAfterSeconds !== undefined) {
      return Math.min(error.retryAfterSeconds, MAX_RETRY_DELAY_SECONDS);
    }
    const backoff = RETRY_DELAY_SECONDS * BACKOFF_FACTOR ** (attempts - FIRST_ATTEMPT);
    return Math.min(backoff, MAX_RETRY_DELAY_SECONDS);
  }
}
