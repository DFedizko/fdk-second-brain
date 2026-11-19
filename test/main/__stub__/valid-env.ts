export const VALID_ENV = {
  GITHUB_TOKEN: "github_pat_11AAAAAAA0aaaaaaaaaaaa_bbbbbbbbbbbbbbbbbbbbbbbbbbb",
  NOTES_REPO_OWNER: "octo-cat",
  NOTES_REPO_NAME: "second-brain.notes",
  NOTES_BRANCH: "notes/main",
  GITHUB_CLIENT_ID: "Ov23liAAAAAAAAAAAAAA",
  GITHUB_CLIENT_SECRET: "0123456789abcdef0123456789abcdef01234567",
  OWNER_GITHUB_LOGIN: "octo-cat",
  GITHUB_WEBHOOK_SECRET: "webhook-secret-of-at-least-32-chars",
  COOKIE_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
} as const;

export type EnvName = keyof typeof VALID_ENV;
