import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import type { IdentityProvider } from "../../../shared/contracts/identity-provider";
import type { HtmlReplies } from "./html-replies";
import type { PkceSource } from "./pkce-generator";
import type { SignInPages } from "./sign-in-pages";

export interface UpstreamData {
  readonly verifier: string;
}

const OK = 200;
const APPROVE = "approve";
const HANDLE_FIELD = "handle";
const DECISION_FIELD = "decision";
const NO_HANDLE = "";

export class ConsentRoute {
  constructor(
    private readonly identity: IdentityProvider,
    private readonly pkce: PkceSource,
    private readonly pages: SignInPages,
    private readonly replies: HtmlReplies,
  ) {}

  async show(request: Request, oauth: OAuthHelpers): Promise<Response> {
    const authRequest = await oauth.parseAuthRequest(request);
    const details = await oauth.describeConsent(authRequest);
    const consent = await oauth.beginConsent(authRequest);
    return this.replies.page(this.pages.consent(details, consent.handle), OK, consent.headers);
  }

  async decide(request: Request, oauth: OAuthHelpers): Promise<Response> {
    const form = await request.formData().catch(() => new FormData());
    const handle = String(form.get(HANDLE_FIELD) ?? NO_HANDLE);
    if (form.get(DECISION_FIELD) !== APPROVE) return this.deny(request, handle, oauth);
    return this.startGitHubSignIn(request, handle, oauth);
  }

  private async deny(request: Request, handle: string, oauth: OAuthHelpers): Promise<Response> {
    const denied = await oauth.denyConsent(request, handle);
    return this.replies.redirect(denied.redirectTo, denied.headers);
  }

  private async startGitHubSignIn(
    request: Request,
    handle: string,
    oauth: OAuthHelpers,
  ): Promise<Response> {
    const approved = await oauth.approveConsent(request, handle);
    const pair = await this.pkce.create();
    const data: UpstreamData = { verifier: pair.verifier };
    const upstream = await oauth.beginUpstream(approved.request, {
      data,
      headers: approved.headers,
    });
    const location = this.identity.authorizeUrl({
      state: upstream.state,
      codeChallenge: pair.challenge,
    });
    return this.replies.redirect(location, upstream.headers);
  }
}
