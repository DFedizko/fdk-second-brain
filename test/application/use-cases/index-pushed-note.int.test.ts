import { IndexQueueConsumer } from "../../../src/adapters/inbound/queue/index-queue-consumer";
import { D1SearchIndex } from "../../../src/adapters/outbound/d1-search/d1-search-index";
import { BudgetedHeadNotes, REQUESTS_PER_MESSAGE } from "../../../src/adapters/outbound/github/budgeted-head-notes";
import { GitHubBranchHead } from "../../../src/adapters/outbound/github/github-branch-head";
import { GitHubErrorTranslator } from "../../../src/adapters/outbound/github/github-error-translator";
import { GitHubGateway } from "../../../src/adapters/outbound/github/github-gateway";
import { IndexNote } from "../../../src/application/use-cases/index-note";
import { IndexNoteFactory } from "../../../src/application/use-cases/index-note-factory";
import { IndexPushedNote } from "../../../src/application/use-cases/index-pushed-note";
import { SearchNotes } from "../../../src/application/use-cases/search-notes";
import { MarkdownChunker } from "../../../src/domain/markdown-chunker";
import { FixedClock } from "../../__stub__/fixed-clock";
import { SpyIndexFailureLog } from "../../__spy__/spy-index-failure-log";
import { FakeMessageBatch } from "../../adapters/inbound/queue/__fake__/fake-message-batch";
import type { FakeGitHubApi } from "../../adapters/outbound/github/__fake__/fake-github-api";
import { buildFakeNotesRepo, NOTES_BRANCH } from "../../adapters/outbound/github/__fake__/fake-notes-repo";
import { connectRepo, FIXED_NOW } from "../../adapters/outbound/github/__fake__/github-note-repo-on-fake";
import { GITHUB_CONFIG } from "../../adapters/outbound/github/__stub__/github-config";
import { LocalRuntime } from "../../shared/adapters/local-runtime";

const PLAN = "projects/plan.md";
const FILE_MODE = "100644";
const SECOND_ATTEMPT = 2;
const REQUESTS_PER_PATH = 4;
const PLAN_CONTENT = "# Plan\n\nShip the nebula release.\n";
const NOT_UTF8 = new Uint8Array([0x23, 0x20, 0xff, 0xfe]);

describe("IndexPushedNote on D1 with a branch that lags behind the push", () => {
    let runtime: LocalRuntime | undefined;
    let api: FakeGitHubApi;
    let consumer: IndexQueueConsumer;
    let searchNotes: SearchNotes;
    let beforeDelete: string;
    let deleted: string;

    beforeEach(async () => {
        runtime = await LocalRuntime.start();
        await runtime.migrate();
        api = buildFakeNotesRepo();
        const log = new SpyIndexFailureLog();
        const index = new D1SearchIndex(await runtime.database(), log);
        const errors = new GitHubErrorTranslator(new FixedClock(FIXED_NOW));
        const github = new GitHubGateway(api.octokit(GITHUB_CONFIG.token), GITHUB_CONFIG, errors);
        const chunker = new MarkdownChunker();
        const indexNote = new IndexNote(index, connectRepo(api), chunker);
        const head = new GitHubBranchHead(new BudgetedHeadNotes(github, REQUESTS_PER_MESSAGE));
        const pushed = new IndexPushedNote(head, new IndexNoteFactory(index, chunker));
        consumer = new IndexQueueConsumer(pushed, log, new FixedClock(FIXED_NOW));
        searchNotes = new SearchNotes(index);
        api.addEntry(NOTES_BRANCH, PLAN, FILE_MODE, PLAN_CONTENT);
        await indexNote.execute({ path: PLAN });
        beforeDelete = api.store.headOf(NOTES_BRANCH) ?? "";
        const files = new Map(api.store.filesAt(NOTES_BRANCH));
        files.delete(PLAN);
        deleted = api.store.advance(NOTES_BRANCH, files, `Delete ${PLAN}`).sha;
        api.store.setRef(NOTES_BRANCH, beforeDelete);
    });

    afterEach(async () => {
        await runtime?.stop();
        runtime = undefined;
    });

    async function searchPaths(): Promise<string[]> {
        return (await searchNotes.execute({ query: "nebula" })).map((hit) => hit.path);
    }

    it("retries the deletion while the branch still shows the note", async () => {
        const batch = FakeMessageBatch.of([{ path: PLAN, commit: deleted }]);

        await consumer.handle(batch);

        expect(batch.outcomes()).toEqual([{ retryDelay: expect.any(Number) }]);
    });

    it("removes the note once the branch has caught up with the push", async () => {
        await consumer.handle(FakeMessageBatch.of([{ path: PLAN, commit: deleted }]));
        api.store.setRef(NOTES_BRANCH, deleted);

        await consumer.handle(FakeMessageBatch.of([{ path: PLAN, commit: deleted }], SECOND_ATTEMPT));

        expect(await searchPaths()).toEqual([]);
    });

    it("indexes a pushed path within its share of the free plan's request budget", async () => {
        api.store.setRef(NOTES_BRANCH, deleted);
        const before = api.served.length;

        await consumer.handle(FakeMessageBatch.of([{ path: PLAN, commit: deleted }]));

        expect(api.served.length - before).toBe(REQUESTS_PER_PATH);
    });

    it("removes a pushed note that is no longer valid text from search", async () => {
        api.store.setRef(NOTES_BRANCH, beforeDelete);
        api.addEntry(NOTES_BRANCH, PLAN, FILE_MODE, NOT_UTF8);
        const commit = api.store.headOf(NOTES_BRANCH) ?? "";
        const batch = FakeMessageBatch.of([{ path: PLAN, commit }]);

        await consumer.handle(batch);

        expect({ outcomes: batch.outcomes(), found: await searchPaths() }).toEqual({
            outcomes: [{ acked: true }],
            found: [],
        });
    });
});
