import { GitHubIdentity } from "../../../../src/adapters/outbound/github-oauth/github-identity";
import { toOAuthSettings } from "../../../../src/main/config/config-settings";
import { SignInFailedError } from "../../../../src/shared/contracts/sign-in-failed-error";
import { VALID_ENV } from "../../../main/__stub__/valid-env";
import { scriptedGitHub } from "./__stub__/scripted-github";

const SETTINGS = toOAuthSettings({ ...VALID_ENV });
const VERIFIER = "a-verifier-of-at-least-forty-three-characters-long";
const GOOD_TOKEN = { access_token: "gho_abc", scope: "", token_type: "bearer" };
const GOOD_USER = { login: "octo-cat", id: 583231 };
const OK = 200;
const HTML_PAGE = "<html>Unicorn!</html>";
const SCHEMA_ERROR = "ZodError";
const PARSE_ERROR = "SyntaxError";
const UNAVAILABLE = 503;
const OUTAGE_PAGE = "Service Unavailable";

async function failureOf(action: Promise<unknown>): Promise<unknown> {
  return action.then(
    () => undefined,
    (error: unknown) => error,
  );
}

const BAD_TOKEN_REPLIES: ReadonlyArray<[string, unknown]> = [
  ["null", null],
  ["an empty object", {}],
  ["a numeric token", { access_token: 42 }],
  ["an empty token", { access_token: "" }],
];

const BAD_USER_REPLIES: ReadonlyArray<[string, unknown]> = [
  ["null", null],
  ["an empty object", {}],
  ["a numeric login", { login: 7, id: 583231 }],
  ["a string ID", { login: "octo-cat", id: "583231" }],
  ["a fractional ID", { login: "octo-cat", id: 5.5 }],
];

describe("GitHubIdentity with unexpected GitHub replies", () => {
  it.each(BAD_TOKEN_REPLIES)("fails the sign-in on a token reply of %s", async (_name, reply) => {
    const identity = new GitHubIdentity(SETTINGS, scriptedGitHub(reply, GOOD_USER));

    const identify = identity.identify("code", VERIFIER);

    await expect(identify).rejects.toThrow(SignInFailedError);
  });

  it.each(BAD_USER_REPLIES)("fails the sign-in on a user reply of %s", async (_name, reply) => {
    const identity = new GitHubIdentity(SETTINGS, scriptedGitHub(GOOD_TOKEN, reply));

    const identify = identity.identify("code", VERIFIER);

    await expect(identify).rejects.toThrow(SignInFailedError);
  });

  it("keeps why a reply was rejected as the cause of the failure", async () => {
    const identity = new GitHubIdentity(SETTINGS, scriptedGitHub({}, GOOD_USER));

    const error = await failureOf(identity.identify("code", VERIFIER));

    expect(error).toMatchObject({ cause: { name: SCHEMA_ERROR } });
  });

  it("keeps the parse error as the cause when a reply is not JSON", async () => {
    const page = () => Promise.resolve(new Response(HTML_PAGE, { status: OK }));
    const identity = new GitHubIdentity(SETTINGS, page);

    const error = await failureOf(identity.identify("code", VERIFIER));

    expect(error).toMatchObject({ cause: { name: PARSE_ERROR } });
  });

  it("keeps GitHub's status and reply as the cause of a refused request", async () => {
    const outage = () => Promise.resolve(new Response(OUTAGE_PAGE, { status: UNAVAILABLE }));
    const identity = new GitHubIdentity(SETTINGS, outage);

    const error = await failureOf(identity.identify("code", VERIFIER));

    expect(error).toMatchObject({ cause: { status: UNAVAILABLE, body: OUTAGE_PAGE } });
  });

  it("identifies the user from well-formed replies", async () => {
    const identity = new GitHubIdentity(SETTINGS, scriptedGitHub(GOOD_TOKEN, GOOD_USER));

    const user = await identity.identify("code", VERIFIER);

    expect(user).toEqual({ login: GOOD_USER.login, id: String(GOOD_USER.id) });
  });
});
