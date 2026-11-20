import type { McpHttpHandler } from "@modelcontextprotocol/server";
import { ContainerModule } from "inversify";
import type { IdentityProvider } from "../../../shared/contracts/identity-provider";
import type { OAuthSettings } from "../../../shared/contracts/oauth-settings";
import { GITHUB_OAUTH } from "../../outbound/github-oauth/github-oauth.symbols";
import { MCP } from "../mcp/mcp.symbols";
import { CallbackRoute } from "./callback-route";
import { ConsentRoute } from "./consent-route";
import { HtmlReplies } from "./html-replies";
import { createOAuthProvider } from "./oauth-provider-factory";
import { OAUTH } from "./oauth.symbols";
import { OwnerGate, type AccessPolicy } from "./owner-gate";
import { PkceGenerator, type PkceSource } from "./pkce-generator";
import { SignInPages } from "./sign-in-pages";
import { SignInRouter } from "./sign-in-router";

export function createOAuthModule(settings: OAuthSettings): ContainerModule {
  return new ContainerModule(({ bind }) => {
    bind(OAUTH.policy).toConstantValue(new OwnerGate(settings.ownerId));
    bind(OAUTH.pkce).toConstantValue(new PkceGenerator());
    bind(OAUTH.pages).toConstantValue(new SignInPages());
    bind(OAUTH.replies).toConstantValue(new HtmlReplies());
    bind(OAUTH.consent)
      .toResolvedValue(
        (identity: IdentityProvider, pkce: PkceSource, pages: SignInPages, replies: HtmlReplies) =>
          new ConsentRoute(identity, pkce, pages, replies),
        [GITHUB_OAUTH.identity, OAUTH.pkce, OAUTH.pages, OAUTH.replies],
      )
      .inSingletonScope();
    bind(OAUTH.callback)
      .toResolvedValue(
        (
          identity: IdentityProvider,
          policy: AccessPolicy,
          pages: SignInPages,
          replies: HtmlReplies,
        ) => new CallbackRoute(identity, policy, pages, replies),
        [GITHUB_OAUTH.identity, OAUTH.policy, OAUTH.pages, OAUTH.replies],
      )
      .inSingletonScope();
    bind(OAUTH.router)
      .toResolvedValue(
        (
          consent: ConsentRoute,
          callback: CallbackRoute,
          pages: SignInPages,
          replies: HtmlReplies,
        ) => new SignInRouter(consent, callback, pages, replies),
        [OAUTH.consent, OAUTH.callback, OAUTH.pages, OAUTH.replies],
      )
      .inSingletonScope();
    bind(OAUTH.provider)
      .toResolvedValue(
        (mcp: McpHttpHandler, router: SignInRouter) => createOAuthProvider(settings, mcp, router),
        [MCP.httpHandler, OAUTH.router],
      )
      .inSingletonScope();
  });
}
