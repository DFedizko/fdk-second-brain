import type { McpEndpoint } from "../mcp/mcp-test-client";

export class BearerEndpoint implements McpEndpoint {
    constructor(
        private readonly inner: McpEndpoint,
        private readonly token: string,
    ) {}

    fetch(request: Request): Promise<Response> {
        const signed = new Request(request);
        signed.headers.set("authorization", `Bearer ${this.token}`);
        return this.inner.fetch(signed);
    }
}
