import { GitHubErrorTranslator } from "../../../../../src/adapters/outbound/github/github-error-translator";
import { GitHubNoteRepo } from "../../../../../src/adapters/outbound/github/github-note-repo";
import { GITHUB_CONFIG } from "../__stub__/github-config";
import type { FakeGitHubApi } from "./fake-github-api";

export function connectRepo(api: FakeGitHubApi, token = GITHUB_CONFIG.token): GitHubNoteRepo {
  const config = { ...GITHUB_CONFIG, token };
  return new GitHubNoteRepo(api.octokit(token), config, new GitHubErrorTranslator());
}
