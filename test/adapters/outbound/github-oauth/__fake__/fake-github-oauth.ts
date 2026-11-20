import { DOCS_PAGE, GitHubReplies, MESSAGE, STATUS } from "../../github/__fake__/github-replies";
import { publicUserShape, type FakeGitHubUser } from "./github-user-shape";
import { ACCESS_DENIED, OAuthReplies, TOKEN_ERROR, type TokenReply } from "./oauth-replies";

export interface FakeOAuthApp {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly callbackUrl: string;
}

interface IssuedCode {
  readonly user: FakeGitHubUser;
  readonly redirectUri: string;
  readonly challenge: string;
}

const AUTHORIZE_PATH = "/login/oauth/authorize";
const TOKEN_PATH = "/login/oauth/access_token";
const USER_PATH = "/user";
const OAUTH_PREFIX = "/login/oauth/";
const BEARER = /^(?:bearer|token) (\S+)$/i;
const TOKEN_TYPE = "bearer";
const NO_SCOPE = "";
const CODE_PREFIX = "fake-code-";
const TOKEN_PREFIX = "gho_fake";
const SHA_256 = "SHA-256";
const FORM_TYPE = "application/x-www-form-urlencoded";

export class FakeGitHubOAuth {
  private readonly codes = new Map<string, IssuedCode>();
  private readonly tokens = new Map<string, FakeGitHubUser>();
  private readonly replies = new OAuthReplies();
  private readonly apiReplies = new GitHubReplies();
  private signedIn?: FakeGitHubUser;
  private denying = false;
  private refusingCodes = false;
  private issued = 0;

  constructor(private readonly app: FakeOAuthApp) {}

  signInAs(user: FakeGitHubUser): void {
    this.signedIn = user;
    this.denying = false;
    this.refusingCodes = false;
  }

  denyAccess(): void {
    this.denying = true;
  }

  refuseCodes(): void {
    this.refusingCodes = true;
  }

  handles(url: URL): boolean {
    return url.pathname.startsWith(OAUTH_PREFIX) || url.pathname === USER_PATH;
  }

  readonly fetch = async (input: string | URL | Request, init?: RequestInit) => {
    const request = new Request(input, init);
    const path = new URL(request.url).pathname;
    if (path === AUTHORIZE_PATH) return this.authorize(new URL(request.url));
    if (path === TOKEN_PATH) return this.exchange(request);
    if (path === USER_PATH) return this.user(request);
    return this.replies.notFound();
  };

  private authorize(url: URL): Response {
    const query = url.searchParams;
    const redirectUri = query.get("redirect_uri") ?? this.app.callbackUrl;
    const state = { state: query.get("state") ?? "" };
    if (query.get("client_id") !== this.app.clientId) return this.replies.notFound();
    if (!this.isCallback(redirectUri)) {
      return this.replies.redirect(this.app.callbackUrl, {
        ...TOKEN_ERROR.redirectMismatch,
        ...state,
      });
    }
    if (this.denying || !this.signedIn) {
      return this.replies.redirect(redirectUri, { ...ACCESS_DENIED, ...state });
    }
    const code = this.issueCode(this.signedIn, redirectUri, query.get("code_challenge") ?? "");
    return this.replies.redirect(redirectUri, { code, ...state });
  }

  private async exchange(request: Request): Promise<Response> {
    const form = await this.readForm(request);
    const issued = this.codes.get(form.get("code") ?? "");
    this.codes.delete(form.get("code") ?? "");
    const reply = await this.judgeExchange(form, issued);
    return this.replies.token(request, reply);
  }

  private async judgeExchange(form: URLSearchParams, issued?: IssuedCode): Promise<TokenReply> {
    const knownClient =
      form.get("client_id") === this.app.clientId &&
      form.get("client_secret") === this.app.clientSecret;
    if (!knownClient) return TOKEN_ERROR.badClient;
    if (!issued || this.refusingCodes) return TOKEN_ERROR.badCode;
    const redirectUri = form.get("redirect_uri");
    if (redirectUri !== null && redirectUri !== issued.redirectUri) {
      return TOKEN_ERROR.redirectMismatch;
    }
    const verified = await this.verifies(form.get("code_verifier") ?? "", issued.challenge);
    if (!verified) return TOKEN_ERROR.badCode;
    return { access_token: this.issueToken(issued.user), scope: NO_SCOPE, token_type: TOKEN_TYPE };
  }

  private user(request: Request): Response {
    const headers = new Headers();
    const token = BEARER.exec(request.headers.get("authorization") ?? "")?.[1];
    const user = token === undefined ? undefined : this.tokens.get(token);
    if (!user) {
      const message = token === undefined ? MESSAGE.requiresAuth : MESSAGE.badCredentials;
      return this.apiReplies.error(STATUS.unauthorized, message, DOCS_PAGE.root, headers);
    }
    return this.apiReplies.json(STATUS.ok, publicUserShape(user), headers);
  }

  private async readForm(request: Request): Promise<URLSearchParams> {
    const text = await request.text();
    const isForm = request.headers.get("content-type")?.startsWith(FORM_TYPE) ?? false;
    if (isForm) return new URLSearchParams(text);
    return new URLSearchParams(text ? JSON.parse(text) : {});
  }

  private async verifies(verifier: string, challenge: string): Promise<boolean> {
    const digest = await crypto.subtle.digest(SHA_256, new TextEncoder().encode(verifier));
    return Buffer.from(digest).toString("base64url") === challenge;
  }

  private isCallback(redirectUri: string): boolean {
    return redirectUri === this.app.callbackUrl;
  }

  private issueCode(user: FakeGitHubUser, redirectUri: string, challenge: string): string {
    this.issued += 1;
    const code = `${CODE_PREFIX}${this.issued}`;
    this.codes.set(code, { user, redirectUri, challenge });
    return code;
  }

  private issueToken(user: FakeGitHubUser): string {
    this.issued += 1;
    const token = `${TOKEN_PREFIX}${this.issued}`;
    this.tokens.set(token, user);
    return token;
  }
}
