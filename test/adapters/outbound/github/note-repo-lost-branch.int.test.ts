import { NotesAccessDenied } from "../../../../src/domain/errors/notes-access-denied";
import { NotesRateLimited } from "../../../../src/domain/errors/notes-rate-limited";
import { NotePath } from "../../../../src/domain/note-path";
import type { GitHubNoteRepo } from "../../../../src/adapters/outbound/github/github-note-repo";
import { ActionPause } from "./__fake__/action-pause";
import type { FakeGitHubApi } from "./__fake__/fake-github-api";
import { DEFAULT_BRANCH, NOTES_BRANCH, buildEmptyNotesRepo } from "./__fake__/fake-notes-repo";
import { connectRepo } from "./__fake__/github-note-repo-on-fake";

const INBOX = NotePath.of("inbox.md");
const PLAN = NotePath.of("plan.md");
const CONTENT = "# Inbox\n";
const PLAN_CONTENT = "# Plan\n";
const BOTH_NOTES = { [PLAN.value]: PLAN_CONTENT, [INBOX.value]: CONTENT };

const OUTAGES = [
  ["a rate limit", "secondary", NotesRateLimited],
  ["a refused token", "forbidden", NotesAccessDenied],
] as const;

describe("GitHubNoteRepo when a first note never made the configured branch", () => {
  let api: FakeGitHubApi;
  let repository: GitHubNoteRepo;

  beforeEach(() => {
    api = buildEmptyNotesRepo();
    api.commitFiles(DEFAULT_BRANCH, { [PLAN.value]: PLAN_CONTENT });
    repository = connectRepo(api);
  });

  it("creates the branch from the default branch and saves the note on it", async () => {
    await repository.create(INBOX, CONTENT);

    expect(api.filesOn(NOTES_BRANCH)).toEqual(BOTH_NOTES);
  });

  it("saves the note when another client creates the branch at the same time", async () => {
    api.raceOnce.beforeRefCreate(() =>
      api.store.setRef(NOTES_BRANCH, api.store.headOf(DEFAULT_BRANCH) ?? ""),
    );

    await repository.create(INBOX, CONTENT);

    expect(api.filesOn(NOTES_BRANCH)).toEqual(BOTH_NOTES);
  });

  it.each(OUTAGES)("reports %s met while checking the branch", async (_name, outage, error) => {
    api.raceOnce.afterBranchMiss(() => api.startOutage(outage));
    const pausing = connectRepo(api, {}, new ActionPause(() => api.endOutage()));

    const create = pausing.create(INBOX, CONTENT);

    await expect(create).rejects.toThrow(error);
  });
});
