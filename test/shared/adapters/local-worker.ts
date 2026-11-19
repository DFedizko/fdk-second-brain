import { createTestHarness, type TestHarness } from "wrangler";

const WRANGLER_CONFIG = "./wrangler.jsonc";

interface WorkerEntry {
  fetch(request: Request): Promise<Response>;
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
    const entry = (await harness.getWorker().getExport()) as unknown as WorkerEntry;
    return new LocalWorker(harness, entry);
  }

  fetch(request: Request): Promise<Response> {
    return this.entry.fetch(request);
  }

  async stop(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;
    await this.harness.close();
  }
}
