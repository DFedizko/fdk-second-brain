import { appModules } from "./app-modules";
import { Bootstrap } from "./bootstrap";
import { EnvConfigParser } from "./config/env-config-parser";

const NOT_FOUND = 404;

const bootstrap = new Bootstrap(new EnvConfigParser(), appModules);

export default {
  fetch: (_request, env): Response => {
    bootstrap.start(env);
    return new Response(null, { status: NOT_FOUND });
  },
} satisfies ExportedHandler<Env>;
