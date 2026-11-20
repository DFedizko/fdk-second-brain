import type { z } from "zod";
import type {
  IdentityProvider,
  SignInChallenge,
  SignedInUser,
} from "../../../shared/contracts/identity-provider";
import type { OAuthSettings } from "../../../shared/contracts/oauth-settings";
import { CALLBACK_PATH } from "../../../shared/contracts/sign-in-paths";
import { SignInFailedError } from "../../../shared/contracts/sign-in-failed-error";
import { TOKEN_REPLY, USER_REPLY } from "./github-replies";

export type HttpFetch = (input: string, init?: RequestInit) => Promise<Response>;

type GitHubUser = z.infer<typeof USER_REPLY>;

const AUTHORIZE_PATH = "/login/oauth/authorize";
const TOKEN_PATH = "/login/oauth/access_token";
const USER_PATH = "/user";
const PKCE_METHOD = "S256";
const NO_SIGNUP = "false";
const JSON_TYPE = "application/json";
const GITHUB_JSON = "application/vnd.github+json";
const API_VERSION = "2026-03-10";
const USER_AGENT = "second-brain-mcp";
const EXCHANGE_FAILED = "GitHub refused the sign-in code";
const USER_FAILED = "GitHub did not return the signed-in user";
const UNREACHABLE = "GitHub could not be reached";

export class GitHubIdentity implements IdentityProvider {
  constructor(
    private readonly settings: OAuthSettings,
    private readonly http: HttpFetch,
  ) {}

  authorizeUrl(challenge: SignInChallenge): string {
    const url = new URL(AUTHORIZE_PATH, this.settings.oauthUrl);
    url.search = new URLSearchParams({
      client_id: this.settings.clientId,
      redirect_uri: this.callbackUrl(),
      state: challenge.state,
      code_challenge: challenge.codeChallenge,
      code_challenge_method: PKCE_METHOD,
      allow_signup: NO_SIGNUP,
    }).toString();
    return url.toString();
  }

  async identify(code: string, codeVerifier: string): Promise<SignedInUser> {
    const token = await this.exchangeCode(code, codeVerifier);
    const user = await this.fetchUser(token);
    return { login: user.login, id: String(user.id) };
  }

  private async exchangeCode(code: string, codeVerifier: string): Promise<string> {
    const response = await this.send(new URL(TOKEN_PATH, this.settings.oauthUrl), {
      method: "POST",
      headers: { accept: JSON_TYPE, "content-type": JSON_TYPE },
      body: JSON.stringify({
        client_id: this.settings.clientId,
        client_secret: this.settings.clientSecret,
        code,
        redirect_uri: this.callbackUrl(),
        code_verifier: codeVerifier,
      }),
    });
    const reply = await this.readJson(response, TOKEN_REPLY, EXCHANGE_FAILED);
    return reply.access_token;
  }

  private async fetchUser(token: string): Promise<GitHubUser> {
    const response = await this.send(new URL(`${this.settings.apiUrl}${USER_PATH}`), {
      headers: {
        accept: GITHUB_JSON,
        authorization: `Bearer ${token}`,
        "user-agent": USER_AGENT,
        "x-github-api-version": API_VERSION,
      },
    });
    return this.readJson(response, USER_REPLY, USER_FAILED);
  }

  private async readJson<T>(response: Response, shape: z.ZodType<T>, failure: string): Promise<T> {
    if (!response.ok) throw new SignInFailedError(failure);
    const body: unknown = await response.json().catch((cause: unknown) => {
      throw new SignInFailedError(failure, { cause });
    });
    const parsed = shape.safeParse(body);
    if (!parsed.success) throw new SignInFailedError(failure, { cause: parsed.error });
    return parsed.data;
  }

  private async send(url: URL, init: RequestInit): Promise<Response> {
    try {
      return await this.http(url.toString(), init);
    } catch (cause) {
      throw new SignInFailedError(UNREACHABLE, { cause });
    }
  }

  private callbackUrl(): string {
    return `${this.settings.publicUrl}${CALLBACK_PATH}`;
  }
}
