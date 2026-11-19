import { z } from "zod";
import { envField } from "./env-field";

const DEFAULT_BRANCH = "main";
const FINE_GRAINED_TOKEN = /^github_pat_\w+$/;
const GITHUB_LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
const REPO_NAME = /^[\w.-]{1,100}$/;
const BRANCH_NAME = /^(?!.*\.\.)[\w./-]+$/;
const CLIENT_ID = /^[A-Za-z0-9]+$/;
const CLIENT_SECRET = /^[0-9a-fA-F]{40}$/;
const LONG_SECRET = /^[\s\S]{32,}$/;
const HEX_KEY = /^[0-9a-fA-F]{64}$/;
const LOGIN_RULES = "letters, digits and single hyphens, at most 39 characters";
const HEX_KEY_RULES = "64 hexadecimal characters (openssl rand -hex 32).";

export const ENV_SCHEMA = z.object({
  GITHUB_TOKEN: envField({
    name: "GITHUB_TOKEN",
    whenMissing:
      "set it to a fine-grained personal access token (starts with github_pat_) limited to the notes repository.",
    expected: "a fine-grained personal access token that starts with github_pat_.",
    pattern: FINE_GRAINED_TOKEN,
  }),
  NOTES_REPO_OWNER: envField({
    name: "NOTES_REPO_OWNER",
    whenMissing: "set it to the GitHub user or organization that owns the notes repository.",
    expected: `a GitHub user or organization name (${LOGIN_RULES}).`,
    pattern: GITHUB_LOGIN,
  }),
  NOTES_REPO_NAME: envField({
    name: "NOTES_REPO_NAME",
    whenMissing: "set it to the name of the notes repository.",
    expected:
      "a GitHub repository name (letters, digits, '.', '-' and '_', at most 100 characters).",
    pattern: REPO_NAME,
  }),
  NOTES_BRANCH: envField({
    name: "NOTES_BRANCH",
    whenMissing: `set it to the branch that holds the notes, or leave it unset to use ${DEFAULT_BRANCH}.`,
    expected: "a branch name made of letters, digits, '.', '_', '-' and '/', with no '..'.",
    pattern: BRANCH_NAME,
  }).default(DEFAULT_BRANCH),
  GITHUB_CLIENT_ID: envField({
    name: "GITHUB_CLIENT_ID",
    whenMissing: "set it to the Client ID of the GitHub OAuth app.",
    expected: "the GitHub OAuth app's Client ID (letters and digits only).",
    pattern: CLIENT_ID,
  }),
  GITHUB_CLIENT_SECRET: envField({
    name: "GITHUB_CLIENT_SECRET",
    whenMissing: "set it to a client secret of the GitHub OAuth app.",
    expected: "a GitHub OAuth app client secret (40 hexadecimal characters).",
    pattern: CLIENT_SECRET,
  }),
  OWNER_GITHUB_LOGIN: envField({
    name: "OWNER_GITHUB_LOGIN",
    whenMissing: "set it to the GitHub login of the only account allowed to sign in.",
    expected: `a GitHub login (${LOGIN_RULES}).`,
    pattern: GITHUB_LOGIN,
  }),
  GITHUB_WEBHOOK_SECRET: envField({
    name: "GITHUB_WEBHOOK_SECRET",
    whenMissing: "set it to the secret of the notes repository's push webhook.",
    expected: "at least 32 characters (openssl rand -hex 32).",
    pattern: LONG_SECRET,
  }),
  COOKIE_ENCRYPTION_KEY: envField({
    name: "COOKIE_ENCRYPTION_KEY",
    whenMissing: `set it to ${HEX_KEY_RULES}`,
    expected: HEX_KEY_RULES,
    pattern: HEX_KEY,
  }),
});

export type AppConfig = z.infer<typeof ENV_SCHEMA>;
