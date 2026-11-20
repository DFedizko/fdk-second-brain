import { ENV_SCHEMA } from "../../../src/main/config/env-schema";
import { VALID_ENV, type EnvName } from "../__stub__/valid-env";

const DEFAULT_BRANCH = "main";
const NOT_A_STRING = 42;
const OPTIONAL_NAME = "NOTES_BRANCH";
const API_URL_NAME = "GITHUB_API_URL";
const DEFAULT_API_URL = "https://api.github.com";
const OAUTH_URL_NAME = "GITHUB_OAUTH_URL";
const DEFAULT_OAUTH_URL = "https://github.com";
const SECRET_LENGTH = 32;
const NOT_AN_OBJECT_MESSAGE =
  "The Worker's env bindings are missing: expected an object holding the environment variables.";
const EMPTY = "";

type OptionalName = typeof OPTIONAL_NAME | typeof API_URL_NAME | typeof OAUTH_URL_NAME;
type RequiredName = Exclude<EnvName, OptionalName>;

const MISSING_MESSAGES: Record<RequiredName, string> = {
  GITHUB_TOKEN:
    "GITHUB_TOKEN is missing: set it to a fine-grained personal access token (starts with github_pat_) limited to the notes repository.",
  NOTES_REPO_OWNER:
    "NOTES_REPO_OWNER is missing: set it to the GitHub user or organization that owns the notes repository.",
  NOTES_REPO_NAME: "NOTES_REPO_NAME is missing: set it to the name of the notes repository.",
  GITHUB_CLIENT_ID: "GITHUB_CLIENT_ID is missing: set it to the Client ID of the GitHub OAuth app.",
  GITHUB_CLIENT_SECRET:
    "GITHUB_CLIENT_SECRET is missing: set it to a client secret of the GitHub OAuth app.",
  OWNER_GITHUB_ID:
    "OWNER_GITHUB_ID is missing: set it to the numeric GitHub user ID of the only account allowed to sign in (see https://api.github.com/users/<login>).",
  GITHUB_WEBHOOK_SECRET:
    "GITHUB_WEBHOOK_SECRET is missing: set it to the secret of the notes repository's push webhook.",
  PUBLIC_URL:
    "PUBLIC_URL is missing: set it to the Worker's public https origin, such as https://second-brain.example.workers.dev.",
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
    "GITHUB_API_URL is invalid: expected an https URL with no trailing slash, such as https://api.github.com (http is allowed only for localhost, 127.0.0.1 or [::1]). The host must be lowercase, with no default port (:443 for https, :80 for http).",
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
    "OWNER_GITHUB_ID",
    "octo-cat",
    "OWNER_GITHUB_ID is invalid: expected a numeric GitHub user ID such as 583231, not a login (see https://api.github.com/users/<login>).",
  ],
  [
    "GITHUB_WEBHOOK_SECRET",
    "too-short",
    "GITHUB_WEBHOOK_SECRET is invalid: expected at least 32 characters with no spaces or line breaks (openssl rand -hex 32).",
  ],
  [
    "PUBLIC_URL",
    "ftp://second-brain.example",
    "PUBLIC_URL is invalid: expected an https origin with no path or trailing slash, such as https://second-brain.example.workers.dev (http is allowed only for localhost, 127.0.0.1 or [::1]). The host must be lowercase, with no default port (:443 for https, :80 for http).",
  ],
  [
    "GITHUB_OAUTH_URL",
    "ftp://github.com",
    "GITHUB_OAUTH_URL is invalid: expected an https origin with no path or trailing slash, such as https://github.com (http is allowed only for localhost, 127.0.0.1 or [::1]). The host must be lowercase, with no default port (:443 for https, :80 for http).",
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
  ["GITHUB_API_URL", "http://api.github.com"],
  ["GITHUB_API_URL", "http://localhost.attacker.example"],
  ["GITHUB_API_URL", "http://127.0.0.1.attacker.example"],
  ["GITHUB_API_URL", "http://10.0.0.5:8787"],
  ["OWNER_GITHUB_ID", "0"],
  ["OWNER_GITHUB_ID", "0583231"],
  ["OWNER_GITHUB_ID", "-583231"],
  ["OWNER_GITHUB_ID", "583231.5"],
  ["OWNER_GITHUB_ID", " 583231"],
  ["PUBLIC_URL", "https://second-brain.example/"],
  ["PUBLIC_URL", "https://second-brain.example/mcp"],
  ["PUBLIC_URL", "http://second-brain.example"],
  ["PUBLIC_URL", "https://second-brain.example?x=1"],
  ["PUBLIC_URL", "https://second-brain.example#top"],
  ["PUBLIC_URL", "https://user:pass@second-brain.example"],
  ["GITHUB_OAUTH_URL", "https://github.com?x=1"],
  ["GITHUB_OAUTH_URL", "https://github.com/login"],
  ["PUBLIC_URL", "https://second-brain.example\\evil.example"],
  ["PUBLIC_URL", "https://second-brain.example:0"],
  ["PUBLIC_URL", "https://second-brain.example:65536"],
  ["PUBLIC_URL", "https://second-brain.example:"],
  ["PUBLIC_URL", "https://second-brain.example:08443"],
  ["PUBLIC_URL", "https://second-brain.example:port"],
  ["PUBLIC_URL", "http://localhost:99999"],
  ["GITHUB_OAUTH_URL", "https://github.com\\login"],
  ["GITHUB_OAUTH_URL", "https://github.com:70000"],
  ["GITHUB_OAUTH_URL", "https://GitHub.com"],
  ["PUBLIC_URL", "https://second-brain.example:443"],
  ["PUBLIC_URL", "http://localhost:80"],
  ["GITHUB_OAUTH_URL", "https://github.com:443"],
  ["GITHUB_API_URL", "https://api.github.com:443"],
  ["GITHUB_API_URL", "http://127.0.0.1:80/api"],
  ["GITHUB_WEBHOOK_SECRET", " ".repeat(SECRET_LENGTH)],
  ["GITHUB_WEBHOOK_SECRET", "a".repeat(SECRET_LENGTH - 1) + "\n"],
  ["GITHUB_WEBHOOK_SECRET", "a".repeat(SECRET_LENGTH) + "\n"],
];

const ACCEPTED_VALUES: ReadonlyArray<[EnvName, string]> = [
  ["OWNER_GITHUB_ID", "1"],
  ["OWNER_GITHUB_ID", "1234567890123"],
  ["NOTES_REPO_OWNER", "legacy--org"],
  ["NOTES_BRANCH", "notes/v1.2-draft"],
  ["GITHUB_API_URL", "http://127.0.0.1:8787"],
  ["GITHUB_API_URL", "http://localhost:8787"],
  ["GITHUB_API_URL", "http://[::1]:8787"],
  ["GITHUB_API_URL", "http://localhost"],
  ["GITHUB_API_URL", "https://github.example.com/api/v3"],
  ["PUBLIC_URL", "http://localhost:8787"],
  ["GITHUB_OAUTH_URL", "http://127.0.0.1:9000"],
  ["PUBLIC_URL", "https://second-brain.example:8443"],
  ["PUBLIC_URL", "https://second-brain.example:65535"],
  ["GITHUB_OAUTH_URL", "https://github.example.com:1"],
  ["PUBLIC_URL", "https://second-brain.example:4430"],
  ["PUBLIC_URL", "http://localhost:443"],
  ["GITHUB_API_URL", "https://github.example.com:80/api/v3"],
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

  it("defaults GITHUB_OAUTH_URL to github.com when it is unset", () => {
    const config = ENV_SCHEMA.parse(withoutVariable(OAUTH_URL_NAME));

    expect(config.GITHUB_OAUTH_URL).toBe(DEFAULT_OAUTH_URL);
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
