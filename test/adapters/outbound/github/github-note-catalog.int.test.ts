import { GitHubErrorTranslator } from "../../../../src/adapters/outbound/github/github-error-translator";
import { GitHubGateway } from "../../../../src/adapters/outbound/github/github-gateway";
import { GitHubNoteCatalog } from "../../../../src/adapters/outbound/github/github-note-catalog";
import { NotesUnavailable } from "../../../../src/domain/errors/notes-unavailable";
import { FixedClock } from "../../../__stub__/fixed-clock";
import type { FakeGitHubApi } from "./__fake__/fake-github-api";
import { buildEmptyNotesRepo, buildFakeNotesRepo, NOTES_BRANCH } from "./__fake__/fake-notes-repo";
import { FIXED_NOW } from "./__fake__/github-note-repo-on-fake";
import { GITHUB_CONFIG } from "./__stub__/github-config";

const PLAN = "projects/plan.md";
const FILE_MODE = "100644";
const PLAN_CONTENT = "# Plan\n";

function connectCatalog(api: FakeGitHubApi): GitHubNoteCatalog {
  const errors = new GitHubErrorTranslator(new FixedClock(FIXED_NOW));
  const github = new GitHubGateway(api.octokit(GITHUB_CONFIG.token), GITHUB_CONFIG, errors);
  return new GitHubNoteCatalog(github);
}

function shaOf(api: FakeGitHubApi, path: string): string | undefined {
  return api.store.filesAt(NOTES_BRANCH)?.get(path);
}

async function listed(catalog: GitHubNoteCatalog) {
  const stamps = await catalog.stamps();
  return stamps.map((stamp) => ({ path: stamp.path.value, version: stamp.version.value }));
}

describe("GitHubNoteCatalog", () => {
  it("lists each note at the head of the branch with its blob sha", async () => {
    const api = buildFakeNotesRepo();
    api.addEntry(NOTES_BRANCH, PLAN, FILE_MODE, PLAN_CONTENT);

    const stamps = await listed(connectCatalog(api));

    expect(stamps).toEqual([{ path: PLAN, version: shaOf(api, PLAN) }]);
  });

  it("lists nothing in an empty repository", async () => {
    const api = buildEmptyNotesRepo();

    const stamps = await listed(connectCatalog(api));

    expect(stamps).toEqual([]);
  });

  it("refuses a tree GitHub cut short", async () => {
    const api = buildFakeNotesRepo();
    api.truncateTrees();

    const stamps = connectCatalog(api).stamps();

    await expect(stamps).rejects.toThrow(NotesUnavailable);
  });
});
