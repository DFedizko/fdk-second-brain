import type { GitHubConfig } from "../../../../../src/adapters/outbound/github/github-config";
import { NOTES_BRANCH, NOTES_OWNER, NOTES_REPO, NOTES_TOKEN } from "../__fake__/fake-notes-repo";

export const GITHUB_CONFIG: GitHubConfig = {
  owner: NOTES_OWNER,
  repo: NOTES_REPO,
  branch: NOTES_BRANCH,
  token: NOTES_TOKEN,
};
