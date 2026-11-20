import {
  authorizationErrorRedirect,
  type AuthorizationErrorCode,
  type AuthRequest,
  type OAuthHelpers,
  type ResumedUpstream,
} from "@cloudflare/workers-oauth-provider";
import type { IdentityProvider, SignedInUser } from "../../../shared/contracts/identity-provider";
import { SignInFailedError } from "../../../shared/contracts/sign-in-failed-error";
import type { UpstreamData } from "./consent-route";
import type { HtmlReplies } from "./html-replies";
import type { AccessPolicy } from "./owner-gate";
import type { SignInPages } from "./sign-in-pages";

const FORBIDDEN = 403;
const CODE_PARAM = "code";
const ERROR_PARAM = "error";
const ACCESS_DENIED = "access_denied";
const SERVER_ERROR = "server_error";
const DECLINED_ON_GITHUB = "The GitHub sign-in was not completed.";
const GITHUB_FAILED = "GitHub could not confirm who signed in.";

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
    if (query.has(ERROR_PARAM) || !code) {
      return this.answerClient(resumed, ACCESS_DENIED, DECLINED_ON_GITHUB);
    }
    try {
      return await this.admit(code, resumed, oauth);
    } catch (error) {
      if (!(error instanceof SignInFailedError)) throw error;
      return this.answerClient(resumed, SERVER_ERROR, GITHUB_FAILED);
    }
  }

  private async admit(
    code: string,
    resumed: ResumedUpstream<UpstreamData>,
    oauth: OAuthHelpers,
  ): Promise<Response> {
    const user = await this.identity.identify(code, resumed.data.verifier);
    if (!this.policy.admits(user)) {
      return this.replies.page(this.pages.refused(), FORBIDDEN, resumed.headers);
    }
    return this.grant(user, resumed.request, resumed.headers, oauth);
  }

  private answerClient(
    resumed: ResumedUpstream<UpstreamData>,
    error: AuthorizationErrorCode,
    description: string,
  ): Response {
    const location = authorizationErrorRedirect(resumed.request, error, description);
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
