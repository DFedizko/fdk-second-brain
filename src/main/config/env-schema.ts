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
const HOST_LABEL = "[a-z0-9](?:[a-z0-9-]*[a-z0-9])?";
const HOST_NAME = `${HOST_LABEL}(?:\\.${HOST_LABEL})*`;
const PORT_NUMBER =
  "(?:6553[0-5]|655[0-2]\\d|65[0-4]\\d{2}|6[0-4]\\d{3}|[1-5]\\d{4}|[1-9]\\d{0,3})";
const HTTPS_DEFAULT_PORT = "443";
const HTTP_DEFAULT_PORT = "80";
const HTTPS_PORT = `(?::(?!${HTTPS_DEFAULT_PORT}\\b)${PORT_NUMBER})?`;
const HTTP_PORT = `(?::(?!${HTTP_DEFAULT_PORT}\\b)${PORT_NUMBER})?`;
const LOOPBACK_HOST = "(?:localhost|127\\.0\\.0\\.1|\\[::1\\])";
const HTTPS_ORIGIN = `https:\\/\\/${HOST_NAME}${HTTPS_PORT}`;
const HTTP_ORIGIN = `http:\\/\\/${LOOPBACK_HOST}${HTTP_PORT}`;
const URL_ORIGIN = `(?:${HTTPS_ORIGIN}|${HTTP_ORIGIN})`;
const URL_PATH = "(?:\\/[^\\s]*[^\\s/])?";
const API_URL = new RegExp(`^${URL_ORIGIN}${URL_PATH}$`);
const ORIGIN_URL = new RegExp(`^${URL_ORIGIN}$`);
const DEFAULT_OAUTH_URL = "https://github.com";
const PUBLIC_URL_SAMPLE = "https://second-brain.example.workers.dev";
const URL_RULES = `(http is allowed only for localhost, 127.0.0.1 or [::1]). The host must be lowercase, with no default port (:${HTTPS_DEFAULT_PORT} for https, :${HTTP_DEFAULT_PORT} for http).`;
const USER_ID = /^[1-9]\d*$/;
const FIND_USER_ID = "see https://api.github.com/users/<login>";
const CLIENT_ID = /^[A-Za-z0-9]+$/;
const CLIENT_SECRET = /^[0-9a-fA-F]{40}$/;
const LONG_SECRET = /^\S{32,}$/;
const LOGIN_RULES =
  "letters, digits and hyphens, not starting with a hyphen, at most 39 characters";
const NOT_AN_OBJECT =
  "The Worker's env bindings are missing: expected an object holding the environment variables.";

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
        expected: `an https URL with no trailing slash, such as ${DEFAULT_API_URL} ${URL_RULES}`,
        pattern: API_URL,
      },
      DEFAULT_API_URL,
    ),
    GITHUB_OAUTH_URL: optionalEnvField(
      {
        name: "GITHUB_OAUTH_URL",
        expected: `an https origin with no path or trailing slash, such as ${DEFAULT_OAUTH_URL} ${URL_RULES}`,
        pattern: ORIGIN_URL,
      },
      DEFAULT_OAUTH_URL,
    ),
    PUBLIC_URL: requiredEnvField({
      name: "PUBLIC_URL",
      whenMissing: `set it to the Worker's public https origin, such as ${PUBLIC_URL_SAMPLE}.`,
      expected: `an https origin with no path or trailing slash, such as ${PUBLIC_URL_SAMPLE} ${URL_RULES}`,
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
    OWNER_GITHUB_ID: requiredEnvField({
      name: "OWNER_GITHUB_ID",
      whenMissing: `set it to the numeric GitHub user ID of the only account allowed to sign in (${FIND_USER_ID}).`,
      expected: `a numeric GitHub user ID such as 583231, not a login (${FIND_USER_ID}).`,
      pattern: USER_ID,
    }),
    GITHUB_WEBHOOK_SECRET: requiredEnvField({
      name: "GITHUB_WEBHOOK_SECRET",
      whenMissing: "set it to the secret of the notes repository's push webhook.",
      expected: "at least 32 characters with no spaces or line breaks (openssl rand -hex 32).",
      pattern: LONG_SECRET,
    }),
  },
  { error: NOT_AN_OBJECT },
);

export type AppConfig = z.infer<typeof ENV_SCHEMA>;
