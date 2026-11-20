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
const CREATE_MIGRATIONS_TABLE = `CREATE TABLE IF NOT EXISTS d1_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;
const SELECT_APPLIED = "SELECT name FROM d1_migrations";
const RECORD_APPLIED = "INSERT INTO d1_migrations (name) VALUES (?1)";

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
    const database = await this.database();
    await database.prepare(CREATE_MIGRATIONS_TABLE).run();
    const applied = await this.appliedMigrations(database);
    const pending = (await this.migrationNames()).filter((name) => !applied.has(name));
    await pending.reduce(
      (previous, name) => previous.then(() => this.applyMigration(database, name)),
      Promise.resolve(),
    );
  }

  async stop(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;
    await this.proxy.dispose();
  }

  private async migrationNames(): Promise<string[]> {
    const scan = new Bun.Glob(MIGRATION_FILES).scan({ cwd: this.migrationsFolder() });
    return (await Array.fromAsync(scan)).sort();
  }

  private async appliedMigrations(database: D1Database): Promise<Set<string>> {
    const { results } = await database.prepare(SELECT_APPLIED).all<{ name: string }>();
    return new Set(results.map((row) => row.name));
  }

  private async applyMigration(database: D1Database, name: string): Promise<void> {
    const sql = await Bun.file(`${this.migrationsFolder()}/${name}`).text();
    const statements = unstable_splitSqlQuery(sql).map((part) => database.prepare(part));
    await database.batch([...statements, database.prepare(RECORD_APPLIED).bind(name)]);
  }

  private migrationsFolder(): string {
    const config = unstable_readConfig({ config: WRANGLER_CONFIG });
    const binding = config.d1_databases.find((entry) => entry.binding === DATABASE_BINDING);
    return binding?.migrations_dir ?? DEFAULT_MIGRATIONS_DIR;
  }
}
