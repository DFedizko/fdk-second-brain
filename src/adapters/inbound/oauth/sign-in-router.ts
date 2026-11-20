import { AuthorizationError, CimdFetchError, type OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { CALLBACK_PATH } from "../../../shared/contracts/sign-in-paths";
import type { CallbackRoute } from "./callback-route";
import type { ConsentRoute } from "./consent-route";
import type { HtmlReplies } from "./html-replies";
import type { SignInPages } from "./sign-in-pages";

export const AUTHORIZE_PATH = "/authorize";

const GET = "GET";
const POST = "POST";
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const UNVERIFIED_CLIENT = "This app could not be verified.";

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
        throw error;
    }

    private failure(message: string, status: number): Response {
        return this.replies.page(this.pages.failed(message), status);
    }
}
