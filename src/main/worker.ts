import { MCP } from "../adapters/inbound/mcp/mcp.symbols";
import { appModules } from "./app-modules";
import { Bootstrap } from "./bootstrap";
import { EnvConfigParser } from "./config/env-config-parser";

const NOT_FOUND = 404;
const MCP_PATHS = new Set(["/mcp", "/mcp/"]);

const bootstrap = new Bootstrap(new EnvConfigParser(), appModules);

export default {
  fetch: async (request, env): Promise<Response> => {
    const container = bootstrap.start(env);
    if (!MCP_PATHS.has(new URL(request.url).pathname))
      return new Response(null, { status: NOT_FOUND });
    return container.get(MCP.httpHandler).fetch(request);
  },
} satisfies ExportedHandler<Env>;
