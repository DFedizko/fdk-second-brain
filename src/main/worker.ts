import { OAUTH } from "../adapters/inbound/oauth/oauth.symbols";
import { INDEX_QUEUE } from "../adapters/inbound/queue/index-queue.symbols";
import { WEBHOOK_PATH } from "../adapters/inbound/webhook/github-webhook-route";
import { WEBHOOK } from "../adapters/inbound/webhook/webhook.symbols";
import { appModules } from "./app-modules";
import { Bootstrap } from "./bootstrap";
import { EnvConfigParser } from "./config/env-config-parser";
import { INDEXING } from "./indexing/indexing.symbols";

const bootstrap = new Bootstrap(new EnvConfigParser(), appModules);

function isWebhook(request: Request): boolean {
  return new URL(request.url).pathname === WEBHOOK_PATH;
}

export default {
  fetch: async (request, env, ctx): Promise<Response> => {
    const container = bootstrap.start(env);
    if (isWebhook(request)) return container.get(WEBHOOK.route).fetch(request);
    return container.get(OAUTH.provider).fetch(request, env, ctx);
  },
  queue: async (batch, env): Promise<void> => {
    await bootstrap.start(env).get(INDEX_QUEUE.consumer).handle(batch);
  },
  scheduled: async (_controller, env): Promise<void> => {
    await bootstrap.start(env).get(INDEXING.reconcile).execute();
  },
} satisfies ExportedHandler<Env>;
