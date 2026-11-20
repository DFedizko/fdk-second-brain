import type { McpTestClient } from "../mcp-test-client";

const RETRY_DELAY_MS = 20;
const MAX_TRIES = 100;

export type HitsCheck = (hits: readonly string[]) => boolean;

export class SettledSearch {
  constructor(private readonly client: McpTestClient) {}

  async until(query: string, settled: HitsCheck, triesLeft = MAX_TRIES): Promise<string[]> {
    const hits = await this.client.callText("search_notes", { query });
    if (settled(hits) || triesLeft <= 1) return hits;
    await Bun.sleep(RETRY_DELAY_MS);
    return this.until(query, settled, triesLeft - 1);
  }
}
