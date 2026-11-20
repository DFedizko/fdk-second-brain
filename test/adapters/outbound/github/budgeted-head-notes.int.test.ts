import { IndexQueueConsumer } from "../../../../src/adapters/inbound/queue/index-queue-consumer";
import {
  BudgetedHeadNotes,
  REQUESTS_PER_MESSAGE,
} from "../../../../src/adapters/outbound/github/budgeted-head-notes";
import { GitHubBranchHead } from "../../../../src/adapters/outbound/github/github-branch-head";
import { GitHubErrorTranslator } from "../../../../src/adapters/outbound/github/github-error-translator";
import { GitHubGateway } from "../../../../src/adapters/outbound/github/github-gateway";
import { IndexNoteFactory } from "../../../../src/application/use-cases/index-note-factory";
import { IndexPushedNote } from "../../../../src/application/use-cases/index-pushed-note";
import { MarkdownChunker } from "../../../../src/domain/markdown-chunker";
import { FixedClock } from "../../../__stub__/fixed-clock";
import { SpyIndexFailureLog } from "../../../__spy__/spy-index-failure-log";
import { FakeMessageBatch } from "../../inbound/queue/__fake__/fake-message-batch";
import type { FakeGitHubApi } from "./__fake__/fake-github-api";
import { buildFakeNotesRepo, NOTES_BRANCH } from "./__fake__/fake-notes-repo";
import { FIXED_NOW } from "./__fake__/github-note-repo-on-fake";
import { ForgetfulSearchIndex } from "./__stub__/forgetful-search-index";
import { GITHUB_CONFIG } from "./__stub__/github-config";

const WRANGLER_CONFIG = "../../../../wrangler.jsonc";
const FREE_PLAN_SUBREQUESTS = 50;
const FILE_MODE = "100644";
const NOTE_CONTENT = "# Note\n\nKeep the comet log.\n";

interface WranglerConfig {
  readonly default: {
    readonly queues: { readonly consumers: readonly { readonly max_batch_size: number }[] };
  };
}

async function maxBatchSize(): Promise<number> {
  const config = (await import(WRANGLER_CONFIG)) as WranglerConfig;
  return config.default.queues.consumers[0]?.max_batch_size ?? 0;
}

function connectConsumer(api: FakeGitHubApi): IndexQueueConsumer {
  const errors = new GitHubErrorTranslator(new FixedClock(FIXED_NOW));
  const github = new GitHubGateway(api.octokit(GITHUB_CONFIG.token), GITHUB_CONFIG, errors);
  const index = new ForgetfulSearchIndex();
  const head = new GitHubBranchHead(new BudgetedHeadNotes(github, REQUESTS_PER_MESSAGE));
  const indexer = new IndexPushedNote(head, new IndexNoteFactory(index, new MarkdownChunker()));
  const log = new SpyIndexFailureLog();
  return new IndexQueueConsumer(indexer, log, new FixedClock(FIXED_NOW));
}

async function fullBatch(api: FakeGitHubApi): Promise<FakeMessageBatch> {
  const paths = Array.from({ length: await maxBatchSize() }, (_, place) => `notes/n${place}.md`);
  paths.forEach((path) => api.addEntry(NOTES_BRANCH, path, FILE_MODE, NOTE_CONTENT));
  const commit = api.store.headOf(NOTES_BRANCH) ?? "";
  return FakeMessageBatch.of(paths.map((path) => ({ path, commit })));
}

describe("BudgetedHeadNotes", () => {
  it("keeps a full batch of endless index passes within the free plan's requests", async () => {
    const api = buildFakeNotesRepo();
    const batch = await fullBatch(api);
    const before = api.served.length;

    await connectConsumer(api).handle(batch);

    expect(api.served.length - before).toBeLessThanOrEqual(FREE_PLAN_SUBREQUESTS);
  });

  it("retries the paths whose request budget ran out", async () => {
    const api = buildFakeNotesRepo();
    const batch = await fullBatch(api);

    await connectConsumer(api).handle(batch);

    expect(
      batch.outcomes().every((outcome) => outcome !== undefined && "retryDelay" in outcome),
    ).toBe(true);
  });
});
