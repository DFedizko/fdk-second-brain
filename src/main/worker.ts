import { OAUTH } from "../adapters/inbound/oauth/oauth.symbols";
import { appModules } from "./app-modules";
import { Bootstrap } from "./bootstrap";
import { EnvConfigParser } from "./config/env-config-parser";

const bootstrap = new Bootstrap(new EnvConfigParser(), appModules);

export default {
  fetch: async (request, env, ctx): Promise<Response> => {
    const container = bootstrap.start(env);
    return container.get(OAUTH.provider).fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
