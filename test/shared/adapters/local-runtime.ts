import { Miniflare } from "miniflare";

// The newest compatibility date the stable Miniflare's workerd supports; wrangler.jsonc may be newer.
const COMPATIBILITY_DATE = "2026-08-06";
const DATABASE_BINDING = "DB";
const DATABASE_ID = "local-second-brain";
const IDLE_WORKER = "export default { fetch: () => new Response(null, { status: 404 }) };";

export class LocalRuntime {
  private constructor(private readonly miniflare: Miniflare) {}

  static async start(): Promise<LocalRuntime> {
    const miniflare = new Miniflare({
      modules: true,
      script: IDLE_WORKER,
      compatibilityDate: COMPATIBILITY_DATE,
      d1Databases: { [DATABASE_BINDING]: DATABASE_ID },
    });
    await miniflare.ready;
    return new LocalRuntime(miniflare);
  }

  async database(): Promise<D1Database> {
    return this.miniflare.getD1Database(DATABASE_BINDING);
  }

  async stop(): Promise<void> {
    await this.miniflare.dispose();
  }
}
