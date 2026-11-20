import { McpE2eStack, OWNER } from "../mcp/mcp-e2e-stack";
import { CLIENT_REDIRECT, WORKER_ORIGIN } from "./sign-in-client";

const STARTUP_TIMEOUT_MS = 60_000;
const UNAUTHORIZED = 401;
const FORBIDDEN = 403;
const FOUND = 302;
const OK = 200;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const SERVER_NAME = "second-brain";
const STRANGER = { login: "octo-dog", id: 777 };
const LOGIN_SQUATTER = { login: OWNER.login, id: 999 };
const MADE_UP_TOKEN = "not-a-real-token";
const RESOURCE_METADATA = `${WORKER_ORIGIN}/.well-known/oauth-protected-resource/mcp`;

let stack: McpE2eStack;

beforeAll(async () => {
  stack = await McpE2eStack.start();
}, STARTUP_TIMEOUT_MS);

afterAll(async () => {
  await stack.stop();
});

beforeEach(() => {
  stack.oauth.signInAs(OWNER);
});

describe("signing in to the MCP server", () => {
  it("refuses an MCP call without a token", async () => {
    const response = await stack.anonymousClient().send("tools/list", {});

    expect(response.status).toBe(UNAUTHORIZED);
  });

  it("points an unauthenticated client at the protected resource metadata", async () => {
    const response = await stack.anonymousClient().send("tools/list", {});

    expect(response.headers.get("www-authenticate")).toContain(RESOURCE_METADATA);
  });

  it("refuses an MCP call with a made-up token", async () => {
    const client = stack.clientWith(MADE_UP_TOKEN);

    const response = await client.send("tools/list", {});

    expect(response.status).toBe(UNAUTHORIZED);
  });

  it("shows a consent page naming the client", async () => {
    const signIn = stack.signInClient();
    await signIn.register();

    const page = await signIn.openConsent();

    expect([page.status, (await page.text()).includes("E2E MCP client")]).toEqual([OK, true]);
  });

  it("sends the owner back to the client with a code", async () => {
    const response = await stack.signInClient().signIn();

    expect(new URL(response.headers.get("location") ?? "").searchParams.has("code")).toBe(true);
  });

  it("lets the signed-in owner use the MCP tools", async () => {
    const token = await stack.signInClient().accessToken();
    const client = stack.clientWith(token);

    const result = await client.initialize();

    expect(result.serverInfo.name).toBe(SERVER_NAME);
  });

  it("refuses a different GitHub user", async () => {
    stack.oauth.signInAs(STRANGER);

    const response = await stack.signInClient().signIn();

    expect([response.status, response.headers.get("location")]).toEqual([FORBIDDEN, null]);
  });

  it("refuses someone who took over the owner's old login", async () => {
    stack.oauth.signInAs(LOGIN_SQUATTER);

    const response = await stack.signInClient().signIn();

    expect([response.status, response.headers.get("location")]).toEqual([FORBIDDEN, null]);
  });

  it("still admits the owner after a rename", async () => {
    stack.oauth.signInAs({ login: "renamed-octo", id: OWNER.id });

    const response = await stack.signInClient().signIn();

    expect(new URL(response.headers.get("location") ?? "").searchParams.has("code")).toBe(true);
  });

  it("returns access_denied to the client when the user denies consent", async () => {
    const signIn = stack.signInClient();
    await signIn.register();
    const consent = await signIn.openConsent();

    const response = await signIn.decide(consent, "deny");

    const location = new URL(response.headers.get("location") ?? "");
    expect([
      response.status,
      location.origin + location.pathname,
      location.searchParams.get("error"),
    ]).toEqual([FOUND, CLIENT_REDIRECT, "access_denied"]);
  });

  it("returns access_denied to the client when the user declines on GitHub", async () => {
    stack.oauth.denyAccess();
    const signIn = stack.signInClient();
    await signIn.register();
    const toGitHub = await signIn.decide(await signIn.openConsent(), "approve");

    const response = await signIn.returnFromGitHub(toGitHub);

    expect(new URL(response.headers.get("location") ?? "").searchParams.get("error")).toBe(
      "access_denied",
    );
  });

  it("returns server_error to the client when GitHub refuses the sign-in code", async () => {
    stack.oauth.refuseCodes();

    const response = await stack.signInClient().signIn();

    const location = new URL(response.headers.get("location") ?? "");
    expect([location.origin + location.pathname, location.searchParams.get("error")]).toEqual([
      CLIENT_REDIRECT,
      "server_error",
    ]);
  });

  it("returns server_error to the client when GitHub reports a broken OAuth app", async () => {
    stack.oauth.suspendApp();

    const response = await stack.signInClient().signIn();

    expect(new URL(response.headers.get("location") ?? "").searchParams.get("error")).toBe(
      "server_error",
    );
  });

  it("answers a consent post that is not a form with a bad request page", async () => {
    const request = new Request(`${WORKER_ORIGIN}/authorize`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision: "approve" }),
    });

    const response = await stack.fetch(request);

    expect(response.status).toBe(BAD_REQUEST);
  });

  it("does not serve MCP below /mcp/", async () => {
    const token = await stack.signInClient().accessToken();
    const request = new Request(`${WORKER_ORIGIN}/mcp/anything`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await stack.fetch(request);

    expect(response.status).toBe(NOT_FOUND);
  });
});
