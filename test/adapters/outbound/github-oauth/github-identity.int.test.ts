import { GitHubIdentity } from "../../../../src/adapters/outbound/github-oauth/github-identity";
import { SignInFailedError } from "../../../../src/shared/contracts/sign-in-failed-error";
import { toOAuthSettings } from "../../../../src/main/config/config-settings";
import { VALID_ENV } from "../../../main/__stub__/valid-env";
import { FakeGitHubOAuth } from "./__fake__/fake-github-oauth";

const SETTINGS = toOAuthSettings({ ...VALID_ENV });
const CALLBACK_URL = `${VALID_ENV.PUBLIC_URL}/callback`;
const OWNER = { login: "octo-cat", id: Number(VALID_ENV.OWNER_GITHUB_ID) };
const STATE = "opaque-state";
const VERIFIER = "a-verifier-of-at-least-forty-three-characters-long";
const WRONG_SECRET = "ffffffffffffffffffffffffffffffffffffffff";
const SHA_256 = "SHA-256";

let github: FakeGitHubOAuth;

async function challengeOf(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(SHA_256, new TextEncoder().encode(verifier));
  return Buffer.from(digest).toString("base64url");
}

async function codeFor(identity: GitHubIdentity): Promise<string> {
  const codeChallenge = await challengeOf(VERIFIER);
  const reply = await github.fetch(identity.authorizeUrl({ state: STATE, codeChallenge }));
  return new URL(reply.headers.get("location") ?? "").searchParams.get("code") ?? "";
}

beforeEach(() => {
  github = new FakeGitHubOAuth({
    clientId: SETTINGS.clientId,
    clientSecret: SETTINGS.clientSecret,
    callbackUrl: CALLBACK_URL,
  });
  github.signInAs(OWNER);
});

describe("GitHubIdentity", () => {
  it("sends the user to GitHub's authorize page with PKCE and no scope", async () => {
    const identity = new GitHubIdentity(SETTINGS, github.fetch);

    const url = new URL(identity.authorizeUrl({ state: STATE, codeChallenge: "challenge" }));

    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: SETTINGS.clientId,
      redirect_uri: CALLBACK_URL,
      state: STATE,
      code_challenge: "challenge",
      code_challenge_method: "S256",
      allow_signup: "false",
    });
  });

  it("builds the authorize URL on the configured GitHub origin", () => {
    const identity = new GitHubIdentity(SETTINGS, github.fetch);

    const url = new URL(identity.authorizeUrl({ state: STATE, codeChallenge: "c" }));

    expect(url.origin + url.pathname).toBe(`${SETTINGS.oauthUrl}/login/oauth/authorize`);
  });

  it("identifies the GitHub user who signed in", async () => {
    const identity = new GitHubIdentity(SETTINGS, github.fetch);
    const code = await codeFor(identity);

    const user = await identity.identify(code, VERIFIER);

    expect(user).toEqual({ login: OWNER.login, id: String(OWNER.id) });
  });

  it("fails when GitHub refuses the code", async () => {
    const identity = new GitHubIdentity(SETTINGS, github.fetch);

    const identify = identity.identify("not-a-code", VERIFIER);

    await expect(identify).rejects.toThrow(SignInFailedError);
  });

  it("fails when the PKCE verifier does not match", async () => {
    const identity = new GitHubIdentity(SETTINGS, github.fetch);
    const code = await codeFor(identity);

    const identify = identity.identify(code, `${VERIFIER}-tampered`);

    await expect(identify).rejects.toThrow(SignInFailedError);
  });

  it("fails when the client secret is wrong", async () => {
    const identity = new GitHubIdentity({ ...SETTINGS, clientSecret: WRONG_SECRET }, github.fetch);
    const code = await codeFor(identity);

    const identify = identity.identify(code, VERIFIER);

    await expect(identify).rejects.toThrow(SignInFailedError);
  });

  it("fails when GitHub cannot be reached", async () => {
    const offline = () => Promise.reject(new TypeError("fetch failed"));
    const identity = new GitHubIdentity(SETTINGS, offline);

    const identify = identity.identify("code", VERIFIER);

    await expect(identify).rejects.toThrow(SignInFailedError);
  });

  it("fails when GitHub answers with a page instead of JSON", async () => {
    const outage = () => Promise.resolve(new Response("<html>Unicorn!</html>", { status: 502 }));
    const identity = new GitHubIdentity(SETTINGS, outage);

    const identify = identity.identify("code", VERIFIER);

    await expect(identify).rejects.toThrow(SignInFailedError);
  });
});
