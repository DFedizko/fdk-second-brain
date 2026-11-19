import { OAuthProvider, type OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import type { McpHttpHandler } from "@modelcontextprotocol/server";
import type { OAuthSettings } from "../../../shared/contracts/oauth-settings";
import { AUTHORIZE_PATH, type SignInRouter } from "./sign-in-router";

interface ProviderEnv {
  readonly OAUTH_PROVIDER: OAuthHelpers;
}

const MCP_PATH = "/mcp";
const TOKEN_PATH = "/oauth/token";
const REGISTER_PATH = "/oauth/register";

export function createOAuthProvider(
  settings: OAuthSettings,
  mcp: McpHttpHandler,
  router: SignInRouter,
): OAuthProvider<object> {
  return new OAuthProvider<object>({
    apiRoute: MCP_PATH,
    apiHandler: { fetch: (request) => mcp.fetch(request) },
    defaultHandler: {
      fetch: (request, env) => router.fetch(request, (env as ProviderEnv).OAUTH_PROVIDER),
    },
    authorizeEndpoint: AUTHORIZE_PATH,
    tokenEndpoint: TOKEN_PATH,
    clientRegistrationEndpoint: REGISTER_PATH,
    resourceMetadata: {
      resource: `${settings.publicUrl}${MCP_PATH}`,
      authorization_servers: [settings.publicUrl],
    },
  });
}
