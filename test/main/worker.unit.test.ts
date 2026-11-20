import { InvalidEnvError } from "../../src/main/config/invalid-env-error";
import worker from "../../src/main/worker";
import { FakeMessageBatch } from "../adapters/inbound/queue/__fake__/fake-message-batch";
import { FakeGitHubWebhook } from "../adapters/inbound/webhook/__fake__/fake-github-webhook";
import { DUMMY_CONTEXT } from "./__dummy__/dummy-execution-context";
import { VALID_ENV } from "./__stub__/valid-env";
import { WORKER_ENV } from "./__stub__/worker-env";

const NOT_FOUND = 404;
const UNAUTHORIZED = 401;
const ANY_URL = "https://second-brain.example/";
const MCP_URL = "https://second-brain.example/mcp";
const MCP_URL_WITH_SLASH = "https://second-brain.example/mcp/";
const NEAR_MISS_URL = "https://second-brain.example/mcpx";
const WEBHOOK_URL = "https://second-brain.example/webhooks/github";
const IGNORED = 204;
const FORGED_SECRET = "a-forged-secret-of-at-least-32-chars";

describe("worker", () => {
  it("answers not found outside the MCP path", async () => {
    const env = { ...WORKER_ENV } as unknown as Env;

    const response = await worker.fetch(new Request(ANY_URL), env, DUMMY_CONTEXT);

    expect(response.status).toBe(NOT_FOUND);
  });

  it("guards MCP at /mcp behind sign-in", async () => {
    const env = { ...WORKER_ENV } as unknown as Env;

    const response = await worker.fetch(new Request(MCP_URL), env, DUMMY_CONTEXT);

    expect(response.status).toBe(UNAUTHORIZED);
  });

  it("guards MCP at /mcp/ with a trailing slash", async () => {
    const env = { ...WORKER_ENV } as unknown as Env;

    const response = await worker.fetch(new Request(MCP_URL_WITH_SLASH), env, DUMMY_CONTEXT);

    expect(response.status).toBe(UNAUTHORIZED);
  });

  it("does not serve paths that only start with /mcp", async () => {
    const env = { ...WORKER_ENV } as unknown as Env;

    const response = await worker.fetch(new Request(NEAR_MISS_URL), env, DUMMY_CONTEXT);

    expect(response.status).toBe(NOT_FOUND);
  });

  it("refuses to serve when the env is invalid", async () => {
    const env = {} as Env;

    const serve = worker.fetch(new Request(ANY_URL), env, DUMMY_CONTEXT);

    await expect(serve).rejects.toThrow(InvalidEnvError);
  });

  it("hands a signed GitHub delivery to the webhook route", async () => {
    const env = { ...WORKER_ENV } as unknown as Env;
    const ping = new FakeGitHubWebhook(VALID_ENV.GITHUB_WEBHOOK_SECRET, WEBHOOK_URL).ping();

    const response = await worker.fetch(new Request(ping), env, DUMMY_CONTEXT);

    expect(response.status).toBe(IGNORED);
  });

  it("refuses a webhook delivery signed with another secret", async () => {
    const env = { ...WORKER_ENV } as unknown as Env;
    const forged = new FakeGitHubWebhook(FORGED_SECRET, WEBHOOK_URL).ping();

    const response = await worker.fetch(new Request(forged), env, DUMMY_CONTEXT);

    expect(response.status).toBe(UNAUTHORIZED);
  });

  it("consumes index queue batches", async () => {
    const env = { ...WORKER_ENV } as unknown as Env;
    const batch = FakeMessageBatch.of([{ unreadable: true }]);

    await worker.queue(batch, env);

    expect(batch.outcomes()).toEqual([{ acked: true }]);
  });

  it("has a daily reconciliation entry", () => {
    expect(worker.scheduled).toBeFunction();
  });
});
