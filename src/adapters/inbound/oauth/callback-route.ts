import {
  authorizationErrorRedirect,
  type AuthRequest,
  type OAuthHelpers,
  type ResumedUpstream,
} from "@cloudflare/workers-oauth-provider";
import type { IdentityProvider, SignedInUser } from "../../../shared/contracts/identity-provider";
import type { UpstreamData } from "./consent-route";
import type { HtmlReplies } from "./html-replies";
import type { AccessPolicy } from "./owner-gate";
import type { SignInPages } from "./sign-in-pages";

const FORBIDDEN = 403;
const CODE_PARAM = "code";
const ERROR_PARAM = "error";
const ACCESS_DENIED = "access_denied";
const DECLINED_ON_GITHUB = "The GitHub sign-in was not completed.";

export class CallbackRoute {
  constructor(
    private readonly identity: IdentityProvider,
    private readonly policy: AccessPolicy,
    private readonly pages: SignInPages,
    private readonly replies: HtmlReplies,
  ) {}

  async finish(request: Request, oauth: OAuthHelpers): Promise<Response> {
    const resumed = await oauth.finishUpstream<UpstreamData>(request);
    const query = new URL(request.url).searchParams;
    const code = query.get(CODE_PARAM);
    if (query.has(ERROR_PARAM) || !code) return this.declined(resumed);
    const user = await this.identity.identify(code, resumed.data.verifier);
    if (!this.policy.admits(user)) {
      return this.replies.page(this.pages.refused(), FORBIDDEN, resumed.headers);
    }
    return this.grant(user, resumed.request, resumed.headers, oauth);
  }

  private declined(resumed: ResumedUpstream<UpstreamData>): Response {
    const location = authorizationErrorRedirect(resumed.request, ACCESS_DENIED, DECLINED_ON_GITHUB);
    return this.replies.redirect(location, resumed.headers);
  }

  private async grant(
    user: SignedInUser,
    authRequest: AuthRequest,
    headers: Headers,
    oauth: OAuthHelpers,
  ): Promise<Response> {
    const { redirectTo } = await oauth.completeAuthorization({
      request: authRequest,
      userId: user.id,
      metadata: { login: user.login },
      scope: authRequest.scope,
      props: { login: user.login },
    });
    return this.replies.redirect(redirectTo, headers);
  }
}
