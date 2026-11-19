import type { GitHubConfig } from "../../../../../src/adapters/outbound/github/github-config";
import { GitHubErrorTranslator } from "../../../../../src/adapters/outbound/github/github-error-translator";
import { GitHubNoteRepo } from "../../../../../src/adapters/outbound/github/github-note-repo";
import { GITHUB_CONFIG } from "../__stub__/github-config";
import type { FakeGitHubApi } from "./fake-github-api";

export function connectRepo(
  api: FakeGitHubApi,
  overrides: Partial<GitHubConfig> = {},
): GitHubNoteRepo {
  const config = { ...GITHUB_CONFIG, ...overrides };
  return new GitHubNoteRepo(api.octokit(config.token), config, new GitHubErrorTranslator());
}
