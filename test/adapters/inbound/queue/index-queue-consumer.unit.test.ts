import {
  IndexQueueConsumer,
  MAX_RETRY_DELAY_SECONDS,
  RETRY_DELAY_SECONDS,
} from "../../../../src/adapters/inbound/queue/index-queue-consumer";
import { BranchBehind } from "../../../../src/domain/errors/branch-behind";
import { InvalidPath } from "../../../../src/domain/errors/invalid-path";
import { NotesRateLimited } from "../../../../src/domain/errors/notes-rate-limited";
import { NotesUnavailable } from "../../../../src/domain/errors/notes-unavailable";
import { UnreadableNote } from "../../../../src/domain/errors/unreadable-note";
import type { PushedNoteIndexer } from "../../../../src/application/use-cases/index-pushed-note";
import { FixedClock } from "../../../__stub__/fixed-clock";
import { SpyIndexFailureLog } from "../../../__spy__/spy-index-failure-log";
import { SpyNoteIndexer } from "../../../application/use-cases/__spy__/spy-note-indexer";
import { FailingNoteIndexer } from "../../../application/use-cases/__stub__/failing-note-indexer";
import { FakeMessageBatch } from "./__fake__/fake-message-batch";
import { SpyPushedIndexer } from "./__spy__/spy-pushed-indexer";

const PLAN = "projects/plan.md";
const IDEA = "ideas/idea.md";
const ACKED = { acked: true } as const;
const THIRD_ATTEMPT = 3;
const MANY_ATTEMPTS = 30;
const RATE_LIMIT_WAIT = 90;
const COMMIT = "0d1a26e67d8f5eaf1f6ba5c57fc3c7d91ac0fd1c";
const NOW = new Date("2026-11-20T12:00:00Z");
const MILLIS_PER_SECOND = 1000;
const UNTIL_RESET = 2400;
const LONG_UNTIL_RESET = 10800;

function secondsFromNow(seconds: number): Date {
  return new Date(NOW.getTime() + seconds * MILLIS_PER_SECOND);
}

describe("IndexQueueConsumer", () => {
  let log: SpyIndexFailureLog;

  const consumerOf = (indexer: PushedNoteIndexer) =>
    new IndexQueueConsumer(indexer, log, new FixedClock(NOW));

  beforeEach(() => {
    log = new SpyIndexFailureLog();
  });

  it("re-indexes each queued path from the head of the branch", async () => {
    const indexer = new SpyNoteIndexer();
    const consumer = consumerOf(indexer);

    await consumer.handle(FakeMessageBatch.of([{ path: PLAN }, { path: IDEA }]));

    expect(indexer.inputs).toEqual([{ path: PLAN }, { path: IDEA }]);
  });

  it("acknowledges each message it indexed", async () => {
    const batch = FakeMessageBatch.of([{ path: PLAN }, { path: IDEA }]);

    await consumerOf(new SpyNoteIndexer()).handle(batch);

    expect(batch.outcomes()).toEqual([ACKED, ACKED]);
  });

  it("retries a message whose indexing failed", async () => {
    const batch = FakeMessageBatch.of([{ path: PLAN }]);
    const consumer = consumerOf(new FailingNoteIndexer(new NotesUnavailable()));

    await consumer.handle(batch);

    expect(batch.outcomes()).toEqual([{ retryDelay: RETRY_DELAY_SECONDS }]);
  });

  it("waits longer before each new attempt", async () => {
    const batch = FakeMessageBatch.of([{ path: PLAN }], THIRD_ATTEMPT);
    const consumer = consumerOf(new FailingNoteIndexer(new NotesUnavailable()));

    await consumer.handle(batch);

    expect(batch.outcomes()).toEqual([{ retryDelay: RETRY_DELAY_SECONDS * 4 }]);
  });

  it("never waits longer than the longest retry delay", async () => {
    const batch = FakeMessageBatch.of([{ path: PLAN }], MANY_ATTEMPTS);
    const consumer = consumerOf(new FailingNoteIndexer(new NotesUnavailable()));

    await consumer.handle(batch);

    expect(batch.outcomes()).toEqual([{ retryDelay: MAX_RETRY_DELAY_SECONDS }]);
  });

  it("waits as long as GitHub asks when rate limited", async () => {
    const batch = FakeMessageBatch.of([{ path: PLAN }]);
    const limited = new NotesRateLimited(undefined, RATE_LIMIT_WAIT);
    const consumer = consumerOf(new FailingNoteIndexer(limited));

    await consumer.handle(batch);

    expect(batch.outcomes()).toEqual([{ retryDelay: RATE_LIMIT_WAIT }]);
  });

  it("waits until GitHub's rate limit resets", async () => {
    const batch = FakeMessageBatch.of([{ path: PLAN }]);
    const limited = new NotesRateLimited(secondsFromNow(UNTIL_RESET));

    await consumerOf(new FailingNoteIndexer(limited)).handle(batch);

    expect(batch.outcomes()).toEqual([{ retryDelay: UNTIL_RESET }]);
  });

  it("never waits longer than the longest retry delay for a rate limit reset", async () => {
    const batch = FakeMessageBatch.of([{ path: PLAN }]);
    const limited = new NotesRateLimited(secondsFromNow(LONG_UNTIL_RESET));

    await consumerOf(new FailingNoteIndexer(limited)).handle(batch);

    expect(batch.outcomes()).toEqual([{ retryDelay: MAX_RETRY_DELAY_SECONDS }]);
  });

  it("logs a failed indexing with its path", async () => {
    const error = new NotesUnavailable();
    const consumer = consumerOf(new FailingNoteIndexer(error));

    await consumer.handle(FakeMessageBatch.of([{ path: PLAN }]));

    expect(log.reported).toEqual([{ path: PLAN, error }]);
  });

  it("drops a path that can never be a note instead of retrying it", async () => {
    const batch = FakeMessageBatch.of([{ path: PLAN }]);
    const invalid = new InvalidPath(PLAN, "only .md files are allowed");
    const consumer = consumerOf(new FailingNoteIndexer(invalid));

    await consumer.handle(batch);

    expect(batch.outcomes()).toEqual([ACKED]);
  });

  it("acknowledges a note that can never be read instead of retrying it", async () => {
    const batch = FakeMessageBatch.of([{ path: PLAN }]);

    await consumerOf(new FailingNoteIndexer(new UnreadableNote(PLAN))).handle(batch);

    expect(batch.outcomes()).toEqual([ACKED]);
  });

  it("logs a note that can never be read", async () => {
    const error = new UnreadableNote(PLAN);

    await consumerOf(new FailingNoteIndexer(error)).handle(FakeMessageBatch.of([{ path: PLAN }]));

    expect(log.reported).toEqual([{ path: PLAN, error }]);
  });

  it("drops and logs a message that holds no path", async () => {
    const batch = FakeMessageBatch.of([{ note: PLAN }]);
    const indexer = new SpyNoteIndexer();

    await consumerOf(indexer).handle(batch);

    expect({
      outcomes: batch.outcomes(),
      indexed: indexer.inputs,
      logged: log.reported.length,
    }).toEqual({ outcomes: [ACKED], indexed: [], logged: 1 });
  });

  it("passes the pushed commit along with the path", async () => {
    const indexer = new SpyPushedIndexer();

    await consumerOf(indexer).handle(FakeMessageBatch.of([{ path: PLAN, commit: COMMIT }]));

    expect(indexer.inputs).toEqual([{ path: PLAN, commit: COMMIT }]);
  });

  it("retries without logging while the branch has not reached the pushed commit", async () => {
    const batch = FakeMessageBatch.of([{ path: PLAN, commit: COMMIT }]);
    const consumer = consumerOf(new FailingNoteIndexer(new BranchBehind(COMMIT)));

    await consumer.handle(batch);

    expect({ outcomes: batch.outcomes(), logged: log.reported }).toEqual({
      outcomes: [{ retryDelay: RETRY_DELAY_SECONDS }],
      logged: [],
    });
  });

  it("logs a branch that is still behind on a later attempt", async () => {
    const batch = FakeMessageBatch.of([{ path: PLAN, commit: COMMIT }], THIRD_ATTEMPT);
    const behind = new BranchBehind(COMMIT);

    await consumerOf(new FailingNoteIndexer(behind)).handle(batch);

    expect(log.reported).toEqual([{ path: PLAN, error: behind }]);
  });
});
