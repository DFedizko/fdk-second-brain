import { GitHubBranchHead } from "../../../../src/adapters/outbound/github/github-branch-head";
import { GitHubErrorTranslator } from "../../../../src/adapters/outbound/github/github-error-translator";
import { GitHubGateway } from "../../../../src/adapters/outbound/github/github-gateway";
import { NotesAccessDenied } from "../../../../src/domain/errors/notes-access-denied";
import { FixedClock } from "../../../__stub__/fixed-clock";
import type { FakeGitHubApi } from "./__fake__/fake-github-api";
import { buildFakeNotesRepo, NOTES_BRANCH } from "./__fake__/fake-notes-repo";
import { FIXED_NOW } from "./__fake__/github-note-repo-on-fake";
import { GITHUB_CONFIG } from "./__stub__/github-config";

const PLAN = "projects/plan.md";
const IDEA = "ideas/idea.md";
const FILE_MODE = "100644";
const UNKNOWN_COMMIT = "abcdefabcdefabcdefabcdefabcdefabcdefabcd";

function connectHead(api: FakeGitHubApi): GitHubBranchHead {
  const errors = new GitHubErrorTranslator(new FixedClock(FIXED_NOW));
  const github = new GitHubGateway(api.octokit(GITHUB_CONFIG.token), GITHUB_CONFIG, errors);
  return new GitHubBranchHead(github);
}

function headOf(api: FakeGitHubApi): string {
  return api.store.headOf(NOTES_BRANCH) ?? "";
}

describe("GitHubBranchHead", () => {
  let api: FakeGitHubApi;
  let head: GitHubBranchHead;

  beforeEach(() => {
    api = buildFakeNotesRepo();
    head = connectHead(api);
  });

  it("has reached the commit the branch points at", async () => {
    api.addEntry(NOTES_BRANCH, PLAN, FILE_MODE, "# Plan\n");

    const reached = await head.hasReached(headOf(api));

    expect(reached).toBe(true);
  });

  it("has reached an older commit of the branch", async () => {
    api.addEntry(NOTES_BRANCH, PLAN, FILE_MODE, "# Plan\n");
    const older = headOf(api);
    api.addEntry(NOTES_BRANCH, IDEA, FILE_MODE, "# Idea\n");

    const reached = await head.hasReached(older);

    expect(reached).toBe(true);
  });

  it("has not reached a commit newer than the branch still shows", async () => {
    const shown = headOf(api);
    api.addEntry(NOTES_BRANCH, PLAN, FILE_MODE, "# Plan\n");
    const pushed = headOf(api);
    api.store.setRef(NOTES_BRANCH, shown);

    const reached = await head.hasReached(pushed);

    expect(reached).toBe(false);
  });

  it("has not reached a commit GitHub does not know yet", async () => {
    const reached = await head.hasReached(UNKNOWN_COMMIT);

    expect(reached).toBe(false);
  });

  it("reports other GitHub failures", async () => {
    api.revokeToken();

    const reached = head.hasReached(headOf(api));

    await expect(reached).rejects.toThrow(NotesAccessDenied);
  });
});
