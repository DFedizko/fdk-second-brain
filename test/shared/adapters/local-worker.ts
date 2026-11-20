import { createTestHarness, type TestHarness } from "wrangler";

const WRANGLER_CONFIG = "./wrangler.jsonc";
const DATABASE_BINDING = "DB";
const DAILY_CRON = "17 4 * * *";
const SCHEDULED_OK = "ok";
const CRON_FAILED = "The daily cron ended with: ";

interface WorkerEntry {
  fetch(request: Request): Promise<Response>;
  scheduled(options: { cron: string; scheduledTime: Date }): Promise<{ outcome: string }>;
}

export class LocalWorker {
  private stopped = false;

  private constructor(
    private readonly harness: TestHarness,
    private readonly entry: WorkerEntry,
  ) {}

  static async start(secrets: Record<string, string>): Promise<LocalWorker> {
    const harness = createTestHarness({ workers: [{ configPath: WRANGLER_CONFIG, secrets }] });
    await harness.listen();
    const worker = harness.getWorker<Env>();
    await worker.applyD1Migrations(DATABASE_BINDING);
    const entry = (await worker.getExport()) as unknown as WorkerEntry;
    return new LocalWorker(harness, entry);
  }

  fetch(request: Request): Promise<Response> {
    return this.entry.fetch(request);
  }

  async runDailyCron(): Promise<void> {
    const { outcome } = await this.entry.scheduled({ cron: DAILY_CRON, scheduledTime: new Date() });
    if (outcome !== SCHEDULED_OK) throw new Error(`${CRON_FAILED}${outcome}`);
  }

  async database(): Promise<D1Database> {
    return (await this.harness.getWorker<Env>().getEnv()).DB;
  }

  async stop(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;
    await this.harness.close();
  }
}
