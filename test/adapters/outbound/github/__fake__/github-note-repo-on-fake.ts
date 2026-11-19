import type { GitHubConfig } from "../../../../../src/adapters/outbound/github/github-config";
import { GitHubErrorTranslator } from "../../../../../src/adapters/outbound/github/github-error-translator";
import { GitHubGateway } from "../../../../../src/adapters/outbound/github/github-gateway";
import { GitHubNoteMover } from "../../../../../src/adapters/outbound/github/github-note-mover";
import { GitHubNoteReader } from "../../../../../src/adapters/outbound/github/github-note-reader";
import { GitHubNoteRepo } from "../../../../../src/adapters/outbound/github/github-note-repo";
import { GITHUB_CONFIG } from "../__stub__/github-config";
import { FixedClock } from "../../../../__stub__/fixed-clock";
import type { FakeGitHubApi } from "./fake-github-api";

export const FIXED_NOW = new Date("2026-11-19T12:00:00Z");

export function connectRepo(
  api: FakeGitHubApi,
  overrides: Partial<GitHubConfig> = {},
): GitHubNoteRepo {
  const config = { ...GITHUB_CONFIG, ...overrides };
  const errors = new GitHubErrorTranslator(new FixedClock(FIXED_NOW));
  const github = new GitHubGateway(api.octokit(config.token), config, errors);
  const reader = new GitHubNoteReader(github);
  return new GitHubNoteRepo(github, reader, new GitHubNoteMover(github, reader));
}
