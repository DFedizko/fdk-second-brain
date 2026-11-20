import type { Clock } from "../../../application/ports/clock";
import type { IndexDropper } from "../../../application/use-cases/drop-note-index";
import type { IndexFailureLog } from "../../../application/ports/index-failure-log";
import type {
  PushedNoteIndexer,
  PushedNoteInput,
} from "../../../application/use-cases/index-pushed-note";
import { BranchBehind } from "../../../domain/errors/branch-behind";
import { InvalidPath } from "../../../domain/errors/invalid-path";
import { NotesRateLimited } from "../../../domain/errors/notes-rate-limited";
import { UnreadableNote } from "../../../domain/errors/unreadable-note";
import { z } from "zod";

export const RETRY_DELAY_SECONDS = 30;
export const MAX_RETRY_DELAY_SECONDS = 3600;
const BACKOFF_FACTOR = 2;
const FIRST_ATTEMPT = 1;
const UNREADABLE_LABEL = "queue message ";
const MILLIS_PER_SECOND = 1000;

const MESSAGE_SCHEMA = z.object({ path: z.string(), commit: z.string().optional() });

class UnreadableMessage extends Error {
  override readonly name = "UnreadableMessage";
}

export class IndexQueueConsumer {
  constructor(
    private readonly indexer: PushedNoteIndexer,
    private readonly dropper: IndexDropper,
    private readonly log: IndexFailureLog,
    private readonly clock: Clock,
  ) {}

  async handle(batch: MessageBatch<unknown>): Promise<void> {
    await Promise.all(batch.messages.map((message) => this.process(message)));
  }

  private async process(message: Message<unknown>): Promise<void> {
    const parsed = MESSAGE_SCHEMA.safeParse(message.body);
    if (!parsed.success) return this.dropUnreadable(message);
    const input = this.toInput(parsed.data.path, parsed.data.commit);
    await this.indexer.execute(input).then(
      () => message.ack(),
      (error: unknown) => this.handleFailure(message, input.path, error),
    );
  }

  private toInput(path: string, commit?: string): PushedNoteInput {
    return commit === undefined ? { path } : { path, commit };
  }

  private dropUnreadable(message: Message<unknown>): void {
    this.log.report({ path: UNREADABLE_LABEL + message.id, error: new UnreadableMessage() });
    message.ack();
  }

  private async handleFailure(
    message: Message<unknown>,
    path: string,
    error: unknown,
  ): Promise<void> {
    if (!this.isFirstWait(message, error)) this.log.report({ path, error });
    if (error instanceof InvalidPath) return message.ack();
    if (error instanceof UnreadableNote) return this.dropUnindexable(message, path);
    this.retryLater(message, error);
  }

  private async dropUnindexable(message: Message<unknown>, path: string): Promise<void> {
    await this.dropper.execute({ path }).then(
      () => message.ack(),
      (error: unknown) => this.reportAndRetry(message, path, error),
    );
  }

  private reportAndRetry(message: Message<unknown>, path: string, error: unknown): void {
    this.log.report({ path, error });
    this.retryLater(message, error);
  }

  private retryLater(message: Message<unknown>, error: unknown): void {
    message.retry({ delaySeconds: this.retryDelay(message.attempts, error) });
  }

  private isFirstWait(message: Message<unknown>, error: unknown): boolean {
    return error instanceof BranchBehind && message.attempts <= FIRST_ATTEMPT;
  }

  private retryDelay(attempts: number, error: unknown): number {
    const limited = error instanceof NotesRateLimited ? this.rateLimitWait(error) : undefined;
    const backoff = RETRY_DELAY_SECONDS * BACKOFF_FACTOR ** (attempts - FIRST_ATTEMPT);
    return Math.min(limited ?? backoff, MAX_RETRY_DELAY_SECONDS);
  }

  private rateLimitWait(error: NotesRateLimited): number | undefined {
    if (error.retryAfterSeconds !== undefined) return error.retryAfterSeconds;
    if (error.resetsAt === undefined) return undefined;
    const millis = error.resetsAt.getTime() - this.clock.now().getTime();
    return Math.max(Math.ceil(millis / MILLIS_PER_SECOND), 0);
  }
}
