import {
  AuthorizationError,
  CimdFetchError,
  type OAuthHelpers,
} from "@cloudflare/workers-oauth-provider";
import { SignInFailedError } from "../../../shared/contracts/sign-in-failed-error";
import type { CallbackRoute } from "./callback-route";
import type { ConsentRoute } from "./consent-route";
import type { HtmlReplies } from "./html-replies";
import type { SignInPages } from "./sign-in-pages";

export const AUTHORIZE_PATH = "/authorize";
export const CALLBACK_PATH = "/callback";

const GET = "GET";
const POST = "POST";
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const BAD_GATEWAY = 502;
const UNVERIFIED_CLIENT = "This app could not be verified.";
const GITHUB_FAILED = "GitHub could not confirm who you are.";

type Route = (request: Request, oauth: OAuthHelpers) => Promise<Response>;

export class SignInRouter {
  private readonly routes: ReadonlyMap<string, Route>;

  constructor(
    consent: ConsentRoute,
    callback: CallbackRoute,
    private readonly pages: SignInPages,
    private readonly replies: HtmlReplies,
  ) {
    this.routes = new Map<string, Route>([
      [`${GET} ${AUTHORIZE_PATH}`, (request, oauth) => consent.show(request, oauth)],
      [`${POST} ${AUTHORIZE_PATH}`, (request, oauth) => consent.decide(request, oauth)],
      [`${GET} ${CALLBACK_PATH}`, (request, oauth) => callback.finish(request, oauth)],
    ]);
  }

  async fetch(request: Request, oauth: OAuthHelpers): Promise<Response> {
    const route = this.routes.get(`${request.method} ${new URL(request.url).pathname}`);
    if (!route) return new Response(null, { status: NOT_FOUND });
    try {
      return await route(request, oauth);
    } catch (error) {
      return this.explain(error);
    }
  }

  private explain(error: unknown): Response {
    if (error instanceof AuthorizationError && error.redirectTo) {
      return this.replies.redirect(error.redirectTo);
    }
    if (error instanceof AuthorizationError) return this.failure(error.description, BAD_REQUEST);
    if (error instanceof CimdFetchError) return this.failure(UNVERIFIED_CLIENT, BAD_REQUEST);
    if (error instanceof SignInFailedError) return this.failure(GITHUB_FAILED, BAD_GATEWAY);
    throw error;
  }

  private failure(message: string, status: number): Response {
    return this.replies.page(this.pages.failed(message), status);
  }
}
