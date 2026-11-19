import {
  InMemoryTransport,
  McpServer,
  type CallToolResult,
  type JSONRPCMessage,
  type Tool,
} from "@modelcontextprotocol/server";
import type { McpTool } from "../../../../../src/adapters/inbound/mcp/mcp-tool";

const JSON_RPC = "2.0";
const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = { name: "unit", version: "0.0.0" };
const CLIENT_INFO = { name: "unit-client", version: "0.0.0" };

type Settle = (message: JSONRPCMessage) => void;

export class InProcessTool {
  private nextId = 1;
  private readonly pending = new Map<number, Settle>();

  private constructor(
    private readonly transport: InMemoryTransport,
    private readonly name: string,
  ) {
    transport.onmessage = (message) => this.settle(message);
  }

  static async connect(tool: McpTool, name: string): Promise<InProcessTool> {
    const server = new McpServer(SERVER_INFO);
    tool.register(server);
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    const client = new InProcessTool(clientSide, name);
    await server.connect(serverSide);
    await clientSide.start();
    await client.handshake();
    return client;
  }

  call(args: Record<string, unknown>): Promise<CallToolResult> {
    return this.request("tools/call", { name: this.name, arguments: args });
  }

  async definition(): Promise<Tool | undefined> {
    const listed = await this.request<{ tools: Tool[] }>("tools/list", {});
    return listed.tools.find((tool) => tool.name === this.name);
  }

  private async handshake(): Promise<void> {
    const params = { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: CLIENT_INFO };
    await this.request("initialize", params);
    await this.transport.send({ jsonrpc: JSON_RPC, method: "notifications/initialized" });
  }

  private request<T>(method: string, params: Record<string, unknown>): Promise<T> {
    const id = this.nextId++;
    const reply = new Promise<JSONRPCMessage>((resolve) => this.pending.set(id, resolve));
    void this.transport.send({ jsonrpc: JSON_RPC, id, method, params });
    return reply.then((message) => this.unwrap<T>(method, message));
  }

  private unwrap<T>(method: string, message: JSONRPCMessage): T {
    if ("result" in message) return message.result as T;
    const error = "error" in message ? message.error.message : method;
    throw new Error(`${method} failed: ${error}`);
  }

  private settle(message: JSONRPCMessage): void {
    if (!("id" in message) || typeof message.id !== "number") return;
    this.pending.get(message.id)?.(message);
    this.pending.delete(message.id);
  }
}
