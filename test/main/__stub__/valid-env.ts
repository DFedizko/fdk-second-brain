export const VALID_ENV = {
  GITHUB_TOKEN: "github_pat_11AAAAAAA0aaaaaaaaaaaa_bbbbbbbbbbbbbbbbbbbbbbbbbbb",
  NOTES_REPO_OWNER: "octo-cat",
  NOTES_REPO_NAME: "second-brain.notes",
  NOTES_BRANCH: "notes/main",
  GITHUB_API_URL: "https://api.github.com",
  GITHUB_CLIENT_ID: "Ov23liAAAAAAAAAAAAAA",
  GITHUB_CLIENT_SECRET: "0123456789abcdef0123456789abcdef01234567",
  OWNER_GITHUB_ID: "583231",
  GITHUB_WEBHOOK_SECRET: "webhook-secret-of-at-least-32-chars",
  PUBLIC_URL: "https://second-brain.example",
  GITHUB_OAUTH_URL: "https://github.com",
} as const;

export type EnvName = keyof typeof VALID_ENV;
