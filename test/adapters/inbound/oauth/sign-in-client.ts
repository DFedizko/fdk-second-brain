import type { FakeGitHubOAuth } from "../../outbound/github-oauth/__fake__/fake-github-oauth";
import type { McpEndpoint } from "../mcp/mcp-test-client";
import { CookieJar } from "./cookie-jar";

export const CLIENT_REDIRECT = "https://client.example/callback";
export const WORKER_ORIGIN = "https://second-brain.example";

const MANUAL = "manual";
const CLIENT_NAME = "E2E MCP client";
const CLIENT_STATE = "client-state-42";
const HANDLE_FIELD = /name="handle" value="([^"]+)"/;
const SHA_256 = "SHA-256";
const FORM_TYPE = "application/x-www-form-urlencoded";
const JSON_TYPE = "application/json";
const VERIFIER = "e2e-client-verifier-that-is-long-enough-for-pkce-rules";

export type ConsentDecision = "approve" | "deny";

interface TokenSet {
  readonly access_token: string;
}

export class SignInClient {
  private readonly jar = new CookieJar();
  private clientId = "";

  constructor(
    private readonly worker: McpEndpoint,
    private readonly github: FakeGitHubOAuth,
  ) {}

  async register(): Promise<void> {
    const response = await this.post("/oauth/register", JSON_TYPE, {
      client_name: CLIENT_NAME,
      redirect_uris: [CLIENT_REDIRECT],
      token_endpoint_auth_method: "none",
    });
    this.clientId = ((await response.json()) as { client_id: string }).client_id;
  }

  async openConsent(): Promise<Response> {
    const query = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: CLIENT_REDIRECT,
      state: CLIENT_STATE,
      code_challenge: await this.challenge(),
      code_challenge_method: "S256",
      resource: `${WORKER_ORIGIN}/mcp`,
    });
    return this.get(`/authorize?${query}`);
  }

  async decide(consentPage: Response, decision: ConsentDecision): Promise<Response> {
    const handle = HANDLE_FIELD.exec(await consentPage.text())?.[1] ?? "";
    return this.post("/authorize", FORM_TYPE, new URLSearchParams({ handle, decision }));
  }

  async returnFromGitHub(toGitHub: Response): Promise<Response> {
    const atGitHub = await this.github.fetch(toGitHub.headers.get("location") ?? "");
    const back = new URL(atGitHub.headers.get("location") ?? "");
    return this.get(`${back.pathname}${back.search}`);
  }

  async signIn(): Promise<Response> {
    await this.register();
    const consent = await this.openConsent();
    const toGitHub = await this.decide(consent, "approve");
    return this.returnFromGitHub(toGitHub);
  }

  async redeem(toClient: Response): Promise<TokenSet> {
    const code = new URL(toClient.headers.get("location") ?? "").searchParams.get("code") ?? "";
    const response = await this.post(
      "/oauth/token",
      FORM_TYPE,
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: this.clientId,
        redirect_uri: CLIENT_REDIRECT,
        code_verifier: VERIFIER,
      }),
    );
    return (await response.json()) as TokenSet;
  }

  async accessToken(): Promise<string> {
    return (await this.redeem(await this.signIn())).access_token;
  }

  private async get(path: string): Promise<Response> {
    const url = new URL(path, WORKER_ORIGIN);
    return this.send(new Request(url, { headers: this.cookies(), redirect: MANUAL }));
  }

  private async post(path: string, type: string, body: object): Promise<Response> {
    const headers = this.cookies();
    headers.set("content-type", type);
    const text = type === JSON_TYPE ? JSON.stringify(body) : String(body);
    const url = new URL(path, WORKER_ORIGIN);
    return this.send(new Request(url, { method: "POST", headers, body: text, redirect: MANUAL }));
  }

  private async send(request: Request): Promise<Response> {
    const response = await this.worker.fetch(request);
    this.jar.keep(response);
    return response;
  }

  private cookies(): Headers {
    return new Headers({ cookie: this.jar.header() });
  }

  private async challenge(): Promise<string> {
    const digest = await crypto.subtle.digest(SHA_256, new TextEncoder().encode(VERIFIER));
    return Buffer.from(digest).toString("base64url");
  }
}
