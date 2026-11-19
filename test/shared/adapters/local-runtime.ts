import { getPlatformProxy, type PlatformProxy } from "wrangler";

const WRANGLER_CONFIG = "wrangler.jsonc";

export class LocalRuntime {
  private stopped = false;

  private constructor(private readonly proxy: PlatformProxy<Env>) {}

  static async start(): Promise<LocalRuntime> {
    const proxy = await getPlatformProxy<Env>({
      configPath: WRANGLER_CONFIG,
      persist: false,
    });
    return new LocalRuntime(proxy);
  }

  bindings(): Env {
    return this.proxy.env;
  }

  async database(): Promise<D1Database> {
    return this.proxy.env.DB;
  }

  async stop(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;
    await this.proxy.dispose();
  }
}
