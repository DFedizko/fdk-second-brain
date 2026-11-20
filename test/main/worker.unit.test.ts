import { InvalidEnvError } from "../../src/main/config/invalid-env-error";
import worker from "../../src/main/worker";
import { WORKER_ENV } from "./__stub__/worker-env";

const NOT_FOUND = 404;
const ANY_URL = "https://second-brain.example/";
const MCP_URL = "https://second-brain.example/mcp";
const MCP_URL_WITH_SLASH = "https://second-brain.example/mcp/";
const NEAR_MISS_URL = "https://second-brain.example/mcpx";

describe("worker", () => {
  it("answers not found outside the MCP path", async () => {
    const env = { ...WORKER_ENV } as unknown as Env;

    const response = await worker.fetch(new Request(ANY_URL), env);

    expect(response.status).toBe(NOT_FOUND);
  });

  it("serves MCP at /mcp", async () => {
    const env = { ...WORKER_ENV } as unknown as Env;

    const response = await worker.fetch(new Request(MCP_URL), env);

    expect(response.status).not.toBe(NOT_FOUND);
  });

  it("serves MCP at /mcp/ with a trailing slash", async () => {
    const env = { ...WORKER_ENV } as unknown as Env;

    const response = await worker.fetch(new Request(MCP_URL_WITH_SLASH), env);

    expect(response.status).not.toBe(NOT_FOUND);
  });

  it("does not serve paths that only start with /mcp", async () => {
    const env = { ...WORKER_ENV } as unknown as Env;

    const response = await worker.fetch(new Request(NEAR_MISS_URL), env);

    expect(response.status).toBe(NOT_FOUND);
  });

  it("refuses to serve when the env is invalid", async () => {
    const env = {} as Env;

    const serve = worker.fetch(new Request(ANY_URL), env);

    await expect(serve).rejects.toThrow(InvalidEnvError);
  });
});
