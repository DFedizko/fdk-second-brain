import type { McpTestClient } from "../mcp-test-client";

const VERSION_PREFIX = "version: ";

export async function readVersion(client: McpTestClient, path: string): Promise<string> {
  const [, versionLine] = await client.callText("read_note", { path });
  return versionLine?.slice(VERSION_PREFIX.length) ?? "";
}
