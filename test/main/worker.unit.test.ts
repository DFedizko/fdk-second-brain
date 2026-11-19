import { InvalidEnvError } from "../../src/main/config/invalid-env-error";
import worker from "../../src/main/worker";
import { VALID_ENV } from "./__stub__/valid-env";

const NOT_FOUND = 404;
const ANY_URL = "https://second-brain.example/";
const MCP_URL = "https://second-brain.example/mcp";

describe("worker", () => {
  it("answers not found outside the MCP path", async () => {
    const env = { ...VALID_ENV } as unknown as Env;

    const response = await worker.fetch(new Request(ANY_URL), env);

    expect(response.status).toBe(NOT_FOUND);
  });

  it("serves MCP at /mcp", async () => {
    const env = { ...VALID_ENV } as unknown as Env;

    const response = await worker.fetch(new Request(MCP_URL), env);

    expect(response.status).not.toBe(NOT_FOUND);
  });

  it("refuses to serve when the env is invalid", async () => {
    const env = {} as Env;

    const serve = worker.fetch(new Request(ANY_URL), env);

    expect(serve).rejects.toThrow(InvalidEnvError);
  });
});
