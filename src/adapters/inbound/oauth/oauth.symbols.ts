import type { OAuthProvider } from "@cloudflare/workers-oauth-provider";
import type { ServiceIdentifier } from "inversify";
import type { CallbackRoute } from "./callback-route";
import type { ConsentRoute } from "./consent-route";
import type { HtmlReplies } from "./html-replies";
import type { AccessPolicy } from "./owner-gate";
import type { PkceSource } from "./pkce-generator";
import type { SignInPages } from "./sign-in-pages";
import type { SignInRouter } from "./sign-in-router";

export const OAUTH = {
  policy: Symbol.for("OAuthAccessPolicy") as ServiceIdentifier<AccessPolicy>,
  pkce: Symbol.for("OAuthPkce") as ServiceIdentifier<PkceSource>,
  pages: Symbol.for("OAuthPages") as ServiceIdentifier<SignInPages>,
  replies: Symbol.for("OAuthReplies") as ServiceIdentifier<HtmlReplies>,
  consent: Symbol.for("OAuthConsent") as ServiceIdentifier<ConsentRoute>,
  callback: Symbol.for("OAuthCallback") as ServiceIdentifier<CallbackRoute>,
  router: Symbol.for("OAuthRouter") as ServiceIdentifier<SignInRouter>,
  provider: Symbol.for("OAuthProvider") as ServiceIdentifier<OAuthProvider<object>>,
} as const;
