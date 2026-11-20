import type {
    CallToolResult,
    InitializeResult,
    JSONRPCErrorResponse,
    ListToolsResult,
} from "@modelcontextprotocol/server";

const MCP_URL = "https://second-brain.example/mcp";
const PROTOCOL_VERSION = "2025-06-18";
const JSON_RPC = "2.0";
const ACCEPT = "application/json, text/event-stream";
const CONTENT_TYPE = "application/json";
const EVENT_STREAM = "text/event-stream";
const DATA_PREFIX = "data: ";
const LINE_BREAK = /\r?\n/;
const CLIENT_INFO = { name: "e2e-test-client", version: "1.0.0" };

export interface McpEndpoint {
    fetch(request: Request): Promise<Response>;
}

export type ToolArguments = Record<string, unknown>;

type RpcReply<T> = { result: T } | JSONRPCErrorResponse;

export class McpTestClient {
    private nextId = 1;

    constructor(private readonly endpoint: McpEndpoint) {}

    initialize(): Promise<InitializeResult> {
        return this.request("initialize", {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: {},
            clientInfo: CLIENT_INFO,
        });
    }

    listTools(): Promise<ListToolsResult> {
        return this.request("tools/list", {});
    }

    callTool(name: string, args: ToolArguments): Promise<CallToolResult> {
        return this.request("tools/call", { name, arguments: args });
    }

    async callText(name: string, args: ToolArguments): Promise<string[]> {
        const result = await this.callTool(name, args);
        return result.content.map((block) => (block.type === "text" ? block.text : block.type));
    }

    async send(method: string, params: object): Promise<Response> {
        const body = { jsonrpc: JSON_RPC, id: this.nextId++, method, params };
        return this.endpoint.fetch(
            new Request(MCP_URL, {
                method: "POST",
                headers: this.headers(),
                body: JSON.stringify(body),
            }),
        );
    }

    private async request<T>(method: string, params: object): Promise<T> {
        const reply = await this.readReply<T>(await this.send(method, params));
        if ("error" in reply) throw new Error(`${method} failed: ${reply.error.message}`);
        return reply.result;
    }

    private async readReply<T>(response: Response): Promise<RpcReply<T>> {
        const text = await response.text();
        const isStream = response.headers.get("content-type")?.startsWith(EVENT_STREAM);
        return JSON.parse(isStream ? this.lastEventData(text) : text);
    }

    private lastEventData(stream: string): string {
        const data = stream.split(LINE_BREAK).filter((line) => line.startsWith(DATA_PREFIX));
        return data.at(-1)?.slice(DATA_PREFIX.length) ?? "";
    }

    private headers(): Headers {
        return new Headers({
            accept: ACCEPT,
            "content-type": CONTENT_TYPE,
            "mcp-protocol-version": PROTOCOL_VERSION,
        });
    }
}
