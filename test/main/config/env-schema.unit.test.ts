import { ENV_SCHEMA } from "../../../src/main/config/env-schema";
import { VALID_ENV, type EnvName } from "../__stub__/valid-env";

const DEFAULT_BRANCH = "main";
const NOT_A_STRING = 42;
const OPTIONAL_NAME = "NOTES_BRANCH";
const API_URL_NAME = "GITHUB_API_URL";
const DEFAULT_API_URL = "https://api.github.com";
const SECRET_LENGTH = 32;
const NOT_AN_OBJECT_MESSAGE =
  "The Worker's env bindings are missing: expected an object holding the environment variables.";
const EMPTY = "";

type RequiredName = Exclude<EnvName, typeof OPTIONAL_NAME | typeof API_URL_NAME>;

const MISSING_MESSAGES: Record<RequiredName, string> = {
  GITHUB_TOKEN:
    "GITHUB_TOKEN is missing: set it to a fine-grained personal access token (starts with github_pat_) limited to the notes repository.",
  NOTES_REPO_OWNER:
    "NOTES_REPO_OWNER is missing: set it to the GitHub user or organization that owns the notes repository.",
  NOTES_REPO_NAME: "NOTES_REPO_NAME is missing: set it to the name of the notes repository.",
  GITHUB_CLIENT_ID: "GITHUB_CLIENT_ID is missing: set it to the Client ID of the GitHub OAuth app.",
  GITHUB_CLIENT_SECRET:
    "GITHUB_CLIENT_SECRET is missing: set it to a client secret of the GitHub OAuth app.",
  OWNER_GITHUB_LOGIN:
    "OWNER_GITHUB_LOGIN is missing: set it to the GitHub login of the only account allowed to sign in.",
  GITHUB_WEBHOOK_SECRET:
    "GITHUB_WEBHOOK_SECRET is missing: set it to the secret of the notes repository's push webhook.",
  COOKIE_ENCRYPTION_KEY:
    "COOKIE_ENCRYPTION_KEY is missing: set it to 64 hexadecimal characters (openssl rand -hex 32).",
};

const INVALID_CASES: ReadonlyArray<[EnvName, unknown, string]> = [
  [
    "GITHUB_TOKEN",
    "ghp_classicTokenNotFineGrained",
    "GITHUB_TOKEN is invalid: expected a fine-grained personal access token that starts with github_pat_.",
  ],
  [
    "NOTES_REPO_OWNER",
    "-not-a-login",
    "NOTES_REPO_OWNER is invalid: expected a GitHub user or organization name (letters, digits and hyphens, not starting with a hyphen, at most 39 characters).",
  ],
  [
    "NOTES_REPO_NAME",
    "notes repo",
    "NOTES_REPO_NAME is invalid: expected a GitHub repository name (letters, digits, '.', '-' and '_', at most 100 characters).",
  ],
  [
    "NOTES_BRANCH",
    "notes..main",
    "NOTES_BRANCH is invalid: expected a valid git branch name made of letters, digits, '.', '_', '-' and '/'.",
  ],
  [
    "GITHUB_API_URL",
    "ftp://api.github.com",
    "GITHUB_API_URL is invalid: expected an http(s) URL with no trailing slash, such as https://api.github.com.",
  ],
  [
    "GITHUB_CLIENT_ID",
    "client id",
    "GITHUB_CLIENT_ID is invalid: expected the Client ID of a GitHub OAuth App, not a GitHub App (letters and digits only).",
  ],
  [
    "GITHUB_CLIENT_SECRET",
    "not-hex",
    "GITHUB_CLIENT_SECRET is invalid: expected a GitHub OAuth app client secret (40 hexadecimal characters).",
  ],
  [
    "OWNER_GITHUB_LOGIN",
    "-leading-hyphen",
    "OWNER_GITHUB_LOGIN is invalid: expected a GitHub login (letters, digits and hyphens, not starting with a hyphen, at most 39 characters).",
  ],
  [
    "GITHUB_WEBHOOK_SECRET",
    "too-short",
    "GITHUB_WEBHOOK_SECRET is invalid: expected at least 32 characters with no spaces or line breaks (openssl rand -hex 32).",
  ],
  [
    "COOKIE_ENCRYPTION_KEY",
    "abc123",
    "COOKIE_ENCRYPTION_KEY is invalid: expected 64 hexadecimal characters (openssl rand -hex 32).",
  ],
];

const MORE_INVALID_VALUES: ReadonlyArray<[EnvName, string]> = [
  ["GITHUB_CLIENT_ID", "Iv1.0123456789abcdef"],
  ["NOTES_REPO_NAME", "."],
  ["NOTES_REPO_NAME", ".."],
  ["NOTES_BRANCH", "/main"],
  ["NOTES_BRANCH", "main/"],
  ["NOTES_BRANCH", "notes//main"],
  ["NOTES_BRANCH", "main.lock"],
  ["NOTES_BRANCH", ".main"],
  ["NOTES_BRANCH", "notes/.hidden"],
  ["NOTES_BRANCH", "main."],
  ["NOTES_BRANCH", "-main"],
  ["NOTES_BRANCH", "notes/-main"],
  ["NOTES_BRANCH", "notes.lock/main"],
  ["NOTES_BRANCH", "notes/."],
  ["NOTES_BRANCH", "HEAD"],
  ["GITHUB_API_URL", "https://api.github.com/"],
  ["GITHUB_API_URL", "api.github.com"],
  ["GITHUB_WEBHOOK_SECRET", " ".repeat(SECRET_LENGTH)],
  ["GITHUB_WEBHOOK_SECRET", "a".repeat(SECRET_LENGTH - 1) + "\n"],
  ["GITHUB_WEBHOOK_SECRET", "a".repeat(SECRET_LENGTH) + "\n"],
];

const ACCEPTED_VALUES: ReadonlyArray<[EnvName, string]> = [
  ["OWNER_GITHUB_LOGIN", "legacy--login"],
  ["OWNER_GITHUB_LOGIN", "legacy-"],
  ["NOTES_REPO_OWNER", "legacy--org"],
  ["NOTES_BRANCH", "notes/v1.2-draft"],
  ["GITHUB_API_URL", "http://127.0.0.1:8787"],
  ["GITHUB_API_URL", "https://github.example.com/api/v3"],
];

const REQUIRED_NAMES = Object.keys(MISSING_MESSAGES) as RequiredName[];

function invalidMessage(name: EnvName): string {
  return INVALID_CASES.find(([caseName]) => caseName === name)?.[2] ?? EMPTY;
}

function withoutVariable(name: EnvName): Record<string, unknown> {
  const { [name]: _removed, ...rest } = VALID_ENV;
  return rest;
}

function issueMessages(env: unknown): string[] {
  const result = ENV_SCHEMA.safeParse(env);
  return result.success ? [] : result.error.issues.map((i) => i.message);
}

describe("ENV_SCHEMA", () => {
  it("parses a valid env into typed config", () => {
    const config = ENV_SCHEMA.parse(VALID_ENV);

    expect(config).toEqual(VALID_ENV);
  });

  it("drops bindings that are not configuration", () => {
    const config = ENV_SCHEMA.parse({ ...VALID_ENV, DB: {} });

    expect(config).not.toHaveProperty("DB");
  });

  it("defaults NOTES_BRANCH to main when it is unset", () => {
    const config = ENV_SCHEMA.parse(withoutVariable(OPTIONAL_NAME));

    expect(config.NOTES_BRANCH).toBe(DEFAULT_BRANCH);
  });

  it("defaults GITHUB_API_URL to the public GitHub API when it is unset", () => {
    const config = ENV_SCHEMA.parse(withoutVariable(API_URL_NAME));

    expect(config.GITHUB_API_URL).toBe(DEFAULT_API_URL);
  });

  it.each(REQUIRED_NAMES)("explains that %s is missing", (name) => {
    const messages = issueMessages(withoutVariable(name));

    expect(messages).toEqual([MISSING_MESSAGES[name]]);
  });

  it("defaults NOTES_BRANCH to main when it is empty", () => {
    const config = ENV_SCHEMA.parse({ ...VALID_ENV, [OPTIONAL_NAME]: EMPTY });

    expect(config.NOTES_BRANCH).toBe(DEFAULT_BRANCH);
  });

  it.each(REQUIRED_NAMES)("treats an empty %s as missing", (name) => {
    const messages = issueMessages({ ...VALID_ENV, [name]: EMPTY });

    expect(messages).toEqual([MISSING_MESSAGES[name]]);
  });

  it.each(INVALID_CASES)("explains that %s is invalid", (name, value, msg) => {
    const messages = issueMessages({ ...VALID_ENV, [name]: value });

    expect(messages).toEqual([msg]);
  });

  it.each(MORE_INVALID_VALUES)("rejects %s %p", (name, value) => {
    const messages = issueMessages({ ...VALID_ENV, [name]: value });

    expect(messages).toEqual([invalidMessage(name)]);
  });

  it.each(ACCEPTED_VALUES)("accepts %s %p", (name, value) => {
    const messages = issueMessages({ ...VALID_ENV, [name]: value });

    expect(messages).toEqual([]);
  });

  it("explains that the env bindings are missing", () => {
    const messages = issueMessages(undefined);

    expect(messages).toEqual([NOT_AN_OBJECT_MESSAGE]);
  });

  it.each(INVALID_CASES)("explains that a non-string %s is invalid", (name, _value, msg) => {
    const messages = issueMessages({ ...VALID_ENV, [name]: NOT_A_STRING });

    expect(messages).toEqual([msg]);
  });

  it("never echoes a secret value in its messages", () => {
    const secret = "github_pat_ with a space";

    const messages = issueMessages({ ...VALID_ENV, GITHUB_TOKEN: secret });

    expect(messages.join()).not.toContain(secret);
  });
});
