import { OAuthProvider, type OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import type { McpHttpHandler } from "@modelcontextprotocol/server";
import type { OAuthSettings } from "../../../shared/contracts/oauth-settings";
import { AUTHORIZE_PATH, type SignInRouter } from "./sign-in-router";

interface ProviderEnv {
  readonly OAUTH_PROVIDER: OAuthHelpers;
}

const MCP_PATH = "/mcp";
const MCP_PATHS = new Set([MCP_PATH, `${MCP_PATH}/`]);
const NOT_FOUND = 404;
const TOKEN_PATH = "/oauth/token";
const REGISTER_PATH = "/oauth/register";

export function createOAuthProvider(
  settings: OAuthSettings,
  mcp: McpHttpHandler,
  router: SignInRouter,
): OAuthProvider<object> {
  return new OAuthProvider<object>({
    apiRoute: MCP_PATH,
    apiHandler: { fetch: (request) => serveMcp(request, mcp) },
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

function serveMcp(request: Request, mcp: McpHttpHandler): Promise<Response> {
  if (MCP_PATHS.has(new URL(request.url).pathname)) return mcp.fetch(request);
  return Promise.resolve(new Response(null, { status: NOT_FOUND }));
}
