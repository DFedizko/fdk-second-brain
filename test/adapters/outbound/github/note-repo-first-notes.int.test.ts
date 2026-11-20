import { NotePath } from "../../../../src/domain/note-path";
import type { GitHubNoteRepo } from "../../../../src/adapters/outbound/github/github-note-repo";
import { ActionPause } from "./__fake__/action-pause";
import type { FakeGitHubApi } from "./__fake__/fake-github-api";
import { DEFAULT_BRANCH, NOTES_BRANCH, buildEmptyNotesRepo } from "./__fake__/fake-notes-repo";
import { connectRepo } from "./__fake__/github-note-repo-on-fake";

const INBOX = NotePath.of("inbox.md");
const PLAN = NotePath.of("plan.md");
const LOG = NotePath.of("log.md");
const CONTENT = "# Inbox\n";
const PLAN_CONTENT = "# Plan\n";
const LOG_CONTENT = "# Log\n";
const INBOX_CREATE = `Create ${INBOX.value}`;
const BOTH_NOTES = { [INBOX.value]: CONTENT, [PLAN.value]: PLAN_CONTENT };

describe("GitHubNoteRepo creating the first notes of an empty repository", () => {
  let api: FakeGitHubApi;
  let repository: GitHubNoteRepo;

  beforeEach(() => {
    api = buildEmptyNotesRepo();
    repository = connectRepo(api);
  });

  function pointNotesAtDefault(): void {
    api.store.setRef(NOTES_BRANCH, api.store.headOf(DEFAULT_BRANCH) ?? "");
  }

  it("puts both of two first notes created at once on the configured branch", async () => {
    const other = connectRepo(api);

    await Promise.all([repository.create(INBOX, CONTENT), other.create(PLAN, PLAN_CONTENT)]);

    expect(api.filesOn(NOTES_BRANCH)).toEqual(BOTH_NOTES);
  });

  it("creates a note after another client made the first commit", async () => {
    api.raceOnce.afterBranchMiss(() => api.seedAllBranches({ [PLAN.value]: PLAN_CONTENT }));

    await repository.create(INBOX, CONTENT);

    expect(api.filesOn(NOTES_BRANCH)).toEqual(BOTH_NOTES);
  });

  it("waits for the branch another client is still creating", async () => {
    api.raceOnce.afterBranchMiss(() =>
      api.commitFiles(DEFAULT_BRANCH, { [PLAN.value]: PLAN_CONTENT }),
    );
    const waiting = connectRepo(api, {}, new ActionPause(pointNotesAtDefault));

    await waiting.create(INBOX, CONTENT);

    expect(api.filesOn(NOTES_BRANCH)).toEqual(BOTH_NOTES);
  });

  it("puts the note on the configured branch when another first note won", async () => {
    api.raceOnce.beforeFirstCommit(() => api.seedAllBranches({ [PLAN.value]: PLAN_CONTENT }));

    await repository.create(INBOX, CONTENT);

    expect(api.filesOn(NOTES_BRANCH)).toEqual(BOTH_NOTES);
  });

  it("creates the note on the branch when the branch moved ahead without it", async () => {
    api.raceOnce.beforeFirstCommit(() => api.seedAllBranches({ [PLAN.value]: PLAN_CONTENT }));
    api.raceOnce.afterUnbranchedPut(() =>
      api.commitFiles(NOTES_BRANCH, { [LOG.value]: LOG_CONTENT }),
    );

    await repository.create(INBOX, CONTENT);

    expect(api.filesOn(NOTES_BRANCH)).toEqual({ ...BOTH_NOTES, [LOG.value]: LOG_CONTENT });
  });

  it("writes the note once when the branch already moved past it", async () => {
    api.raceOnce.afterUnbranchedPut(() => {
      api.commitFiles(DEFAULT_BRANCH, { [PLAN.value]: PLAN_CONTENT });
      pointNotesAtDefault();
    });

    await repository.create(INBOX, CONTENT);

    const creates = api.store.history(NOTES_BRANCH).filter((c) => c.message === INBOX_CREATE);
    expect(creates).toHaveLength(1);
  });

  it("creates the note when another client creates the branch first", async () => {
    api.raceOnce.beforeRefCreate(pointNotesAtDefault);

    await repository.create(INBOX, CONTENT);

    expect(api.filesOn(NOTES_BRANCH)).toEqual({ [INBOX.value]: CONTENT });
  });

  it("creates the first note while GitHub still reads the new commit as empty", async () => {
    api.lagRefReadsAsEmpty(1);

    await repository.create(INBOX, CONTENT);

    expect(api.filesOn(NOTES_BRANCH)).toEqual({ [INBOX.value]: CONTENT });
  });

  it("creates the first note when another client makes the branch while reads lag", async () => {
    api.lagRefReadsAsEmpty(2);
    api.raceOnce.beforeRefCreate(pointNotesAtDefault);

    await repository.create(INBOX, CONTENT);

    expect(api.filesOn(NOTES_BRANCH)).toEqual({ [INBOX.value]: CONTENT });
  });
});
