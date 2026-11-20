import type { GitHubConfig } from "../../../../../src/adapters/outbound/github/github-config";
import { GitHubErrorTranslator } from "../../../../../src/adapters/outbound/github/github-error-translator";
import { GitHubFirstNote } from "../../../../../src/adapters/outbound/github/github-first-note";
import { GitHubGateway } from "../../../../../src/adapters/outbound/github/github-gateway";
import { GitHubNoteMover } from "../../../../../src/adapters/outbound/github/github-note-mover";
import { GitHubNoteReader } from "../../../../../src/adapters/outbound/github/github-note-reader";
import { GitHubNoteRepo } from "../../../../../src/adapters/outbound/github/github-note-repo";
import type { RetryPause } from "../../../../../src/adapters/outbound/github/retry-pause";
import { NO_PAUSE } from "../__stub__/action-pause";
import { GITHUB_CONFIG } from "../__stub__/github-config";
import { FixedClock } from "../../../../__stub__/fixed-clock";
import type { FakeGitHubApi } from "./fake-github-api";

export const FIXED_NOW = new Date("2026-11-19T12:00:00Z");

export function connectRepo(
  api: FakeGitHubApi,
  overrides: Partial<GitHubConfig> = {},
  pause: RetryPause = NO_PAUSE,
): GitHubNoteRepo {
  const config = { ...GITHUB_CONFIG, ...overrides };
  const errors = new GitHubErrorTranslator(new FixedClock(FIXED_NOW));
  const github = new GitHubGateway(api.octokit(config.token), config, errors);
  const reader = new GitHubNoteReader(github);
  const mover = new GitHubNoteMover(github, reader);
  const firstNote = new GitHubFirstNote(github, reader);
  return new GitHubNoteRepo(github, reader, mover, firstNote, pause);
}
