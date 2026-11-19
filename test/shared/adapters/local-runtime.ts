import {
  getPlatformProxy,
  unstable_readConfig,
  unstable_splitSqlQuery,
  type PlatformProxy,
} from "wrangler";

const WRANGLER_CONFIG = "wrangler.jsonc";
const DATABASE_BINDING = "DB";
const DEFAULT_MIGRATIONS_DIR = "migrations";
const MIGRATION_FILES = "*.sql";

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

  async migrate(): Promise<void> {
    const folder = this.migrationsFolder();
    const scan = new Bun.Glob(MIGRATION_FILES).scan({ cwd: folder, absolute: true });
    const files = (await Array.fromAsync(scan)).sort();
    const scripts = await Promise.all(files.map((file) => Bun.file(file).text()));
    const database = await this.database();
    const statements = scripts.flatMap((sql) => unstable_splitSqlQuery(sql));
    await database.batch(statements.map((sql) => database.prepare(sql)));
  }

  async stop(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;
    await this.proxy.dispose();
  }

  private migrationsFolder(): string {
    const config = unstable_readConfig({ config: WRANGLER_CONFIG });
    const binding = config.d1_databases.find((entry) => entry.binding === DATABASE_BINDING);
    return binding?.migrations_dir ?? DEFAULT_MIGRATIONS_DIR;
  }
}
