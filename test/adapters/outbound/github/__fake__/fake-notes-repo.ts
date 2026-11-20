import { FakeGitHubApi } from "./fake-github-api";

export const NOTES_OWNER = "fedizko";
export const NOTES_REPO = "notes";
export const NOTES_TOKEN = "ghp_fakeTokenThatMustNeverLeak0000";
export const DEFAULT_BRANCH = "main";
export const NOTES_BRANCH = "notes";
export const HIDDEN_NOTE = ".github/pull-request.md";
export const IMAGE = "assets/logo.png";

export function buildFakeNotesRepo(): FakeGitHubApi {
  return new FakeGitHubApi({
    owner: NOTES_OWNER,
    repo: NOTES_REPO,
    token: NOTES_TOKEN,
    branches: [DEFAULT_BRANCH, NOTES_BRANCH],
    seed: { [HIDDEN_NOTE]: "# PR template\n", [IMAGE]: "PNG" },
  });
}

export function buildEmptyNotesRepo(): FakeGitHubApi {
  return new FakeGitHubApi({
    owner: NOTES_OWNER,
    repo: NOTES_REPO,
    token: NOTES_TOKEN,
    branches: [DEFAULT_BRANCH, NOTES_BRANCH],
    seed: {},
    empty: true,
  });
}
