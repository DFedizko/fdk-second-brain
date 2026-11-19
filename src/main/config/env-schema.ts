import { z } from "zod";
import { optionalEnvField, requiredEnvField } from "./env-field";

const DEFAULT_BRANCH = "main";
const FINE_GRAINED_TOKEN = /^github_pat_\w+$/;
const GITHUB_LOGIN = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/;
const REPO_NAME = /^(?!\.{1,2}$)[\w.-]{1,100}$/;
const BRANCH_RULES = [
  "(?!HEAD$)",
  "(?!\\/)",
  "(?!.*\\/$)",
  "(?!.*\\/\\/)",
  "(?!.*\\.\\.)",
  "(?!(?:.*\\/)?[.-])",
  "(?!.*\\.(?:\\/|$))",
  "(?!.*\\.lock(?:\\/|$))",
];
const BRANCH_NAME = new RegExp(`^${BRANCH_RULES.join("")}[\\w./-]+$`);
const DEFAULT_API_URL = "https://api.github.com";
const URL_ORIGIN =
  "(?:https:\\/\\/[^\\s/]+|http:\\/\\/(?:localhost|127\\.0\\.0\\.1|\\[::1\\])(?::\\d+)?)";
const URL_PATH = "(?:\\/[^\\s]*[^\\s/])?";
const API_URL = new RegExp(`^${URL_ORIGIN}${URL_PATH}$`);
const ORIGIN_URL = new RegExp(`^${URL_ORIGIN}$`);
const DEFAULT_OAUTH_URL = "https://github.com";
const PUBLIC_URL_SAMPLE = "https://second-brain.example.workers.dev";
const LOOPBACK_RULE = "(http is allowed only for localhost, 127.0.0.1 or [::1]).";
const CLIENT_ID = /^[A-Za-z0-9]+$/;
const CLIENT_SECRET = /^[0-9a-fA-F]{40}$/;
const LONG_SECRET = /^\S{32,}$/;
const HEX_KEY = /^[0-9a-fA-F]{64}$/;
const LOGIN_RULES =
  "letters, digits and hyphens, not starting with a hyphen, at most 39 characters";
const NOT_AN_OBJECT =
  "The Worker's env bindings are missing: expected an object holding the environment variables.";
const HEX_KEY_RULES = "64 hexadecimal characters (openssl rand -hex 32).";

export const ENV_SCHEMA = z.object(
  {
    GITHUB_TOKEN: requiredEnvField({
      name: "GITHUB_TOKEN",
      whenMissing:
        "set it to a fine-grained personal access token (starts with github_pat_) limited to the notes repository.",
      expected: "a fine-grained personal access token that starts with github_pat_.",
      pattern: FINE_GRAINED_TOKEN,
    }),
    NOTES_REPO_OWNER: requiredEnvField({
      name: "NOTES_REPO_OWNER",
      whenMissing: "set it to the GitHub user or organization that owns the notes repository.",
      expected: `a GitHub user or organization name (${LOGIN_RULES}).`,
      pattern: GITHUB_LOGIN,
    }),
    NOTES_REPO_NAME: requiredEnvField({
      name: "NOTES_REPO_NAME",
      whenMissing: "set it to the name of the notes repository.",
      expected:
        "a GitHub repository name (letters, digits, '.', '-' and '_', at most 100 characters).",
      pattern: REPO_NAME,
    }),
    NOTES_BRANCH: optionalEnvField(
      {
        name: "NOTES_BRANCH",
        expected: "a valid git branch name made of letters, digits, '.', '_', '-' and '/'.",
        pattern: BRANCH_NAME,
      },
      DEFAULT_BRANCH,
    ),
    GITHUB_API_URL: optionalEnvField(
      {
        name: "GITHUB_API_URL",
        expected: `an https URL with no trailing slash, such as ${DEFAULT_API_URL} ${LOOPBACK_RULE}`,
        pattern: API_URL,
      },
      DEFAULT_API_URL,
    ),
    GITHUB_OAUTH_URL: optionalEnvField(
      {
        name: "GITHUB_OAUTH_URL",
        expected: `an https origin with no path or trailing slash, such as ${DEFAULT_OAUTH_URL} ${LOOPBACK_RULE}`,
        pattern: ORIGIN_URL,
      },
      DEFAULT_OAUTH_URL,
    ),
    PUBLIC_URL: requiredEnvField({
      name: "PUBLIC_URL",
      whenMissing: `set it to the Worker's public https origin, such as ${PUBLIC_URL_SAMPLE}.`,
      expected: `an https origin with no path or trailing slash, such as ${PUBLIC_URL_SAMPLE} ${LOOPBACK_RULE}`,
      pattern: ORIGIN_URL,
    }),
    GITHUB_CLIENT_ID: requiredEnvField({
      name: "GITHUB_CLIENT_ID",
      whenMissing: "set it to the Client ID of the GitHub OAuth app.",
      expected: "the Client ID of a GitHub OAuth App, not a GitHub App (letters and digits only).",
      pattern: CLIENT_ID,
    }),
    GITHUB_CLIENT_SECRET: requiredEnvField({
      name: "GITHUB_CLIENT_SECRET",
      whenMissing: "set it to a client secret of the GitHub OAuth app.",
      expected: "a GitHub OAuth app client secret (40 hexadecimal characters).",
      pattern: CLIENT_SECRET,
    }),
    OWNER_GITHUB_LOGIN: requiredEnvField({
      name: "OWNER_GITHUB_LOGIN",
      whenMissing: "set it to the GitHub login of the only account allowed to sign in.",
      expected: `a GitHub login (${LOGIN_RULES}).`,
      pattern: GITHUB_LOGIN,
    }),
    GITHUB_WEBHOOK_SECRET: requiredEnvField({
      name: "GITHUB_WEBHOOK_SECRET",
      whenMissing: "set it to the secret of the notes repository's push webhook.",
      expected: "at least 32 characters with no spaces or line breaks (openssl rand -hex 32).",
      pattern: LONG_SECRET,
    }),
    COOKIE_ENCRYPTION_KEY: requiredEnvField({
      name: "COOKIE_ENCRYPTION_KEY",
      whenMissing: `set it to ${HEX_KEY_RULES}`,
      expected: HEX_KEY_RULES,
      pattern: HEX_KEY,
    }),
  },
  { error: NOT_AN_OBJECT },
);

export type AppConfig = z.infer<typeof ENV_SCHEMA>;
