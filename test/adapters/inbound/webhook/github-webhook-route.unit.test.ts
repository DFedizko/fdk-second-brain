import {
  GitHubWebhookRoute,
  MAX_PUSH_COMMITS,
} from "../../../../src/adapters/inbound/webhook/github-webhook-route";
import { WebhookSignature } from "../../../../src/adapters/inbound/webhook/webhook-signature";
import { FakeGitHubWebhook, WEBHOOK_URL } from "./__fake__/fake-github-webhook";
import { SpyChangeQueue } from "./__spy__/spy-change-queue";
import { SpyReconciler } from "./__spy__/spy-reconciler";

const SECRET = "webhook-secret-of-at-least-32-chars";
const BRANCH = "notes/main";
const OTHER_BRANCH = "drafts";
const PLAN = "projects/plan.md";
const IDEA = "ideas/idea.md";
const OLD = "archive/old.md";
const ACCEPTED = 202;
const IGNORED = 204;
const BAD_REQUEST = 400;
const UNAUTHORIZED = 401;
const NOT_ALLOWED = 405;
const UNSUPPORTED = 415;
const FORM_TYPE = "application/x-www-form-urlencoded";

describe("GitHubWebhookRoute", () => {
  let changes: SpyChangeQueue;
  let reconciler: SpyReconciler;
  let route: GitHubWebhookRoute;
  const github = new FakeGitHubWebhook(SECRET);

  beforeEach(() => {
    changes = new SpyChangeQueue();
    reconciler = new SpyReconciler();
    route = new GitHubWebhookRoute(
      new WebhookSignature({ secret: SECRET }),
      changes,
      reconciler,
      BRANCH,
    );
  });

  it("queues the added, modified and removed files of a push to the notes branch", async () => {
    const request = github.push({
      branch: BRANCH,
      commits: [{ added: [PLAN] }, { modified: [IDEA], removed: [OLD] }],
    });

    await route.fetch(request);

    expect(changes.calls).toEqual([[PLAN, IDEA, OLD]]);
  });

  it("answers a queued push with accepted", async () => {
    const response = await route.fetch(
      github.push({ branch: BRANCH, commits: [{ added: [PLAN] }] }),
    );

    expect(response.status).toBe(ACCEPTED);
  });

  it("ignores a push to another branch", async () => {
    const response = await route.fetch(
      github.push({ branch: OTHER_BRANCH, commits: [{ added: [PLAN] }] }),
    );

    expect({ status: response.status, calls: changes.calls }).toEqual({
      status: IGNORED,
      calls: [],
    });
  });

  it("ignores the deletion of the notes branch", async () => {
    const response = await route.fetch(github.push({ branch: BRANCH, deleted: true, commits: [] }));

    expect({ status: response.status, runs: reconciler.runs }).toEqual({
      status: IGNORED,
      runs: 0,
    });
  });

  it("answers a ping without queueing anything", async () => {
    const response = await route.fetch(github.ping());

    expect({ status: response.status, calls: changes.calls }).toEqual({
      status: IGNORED,
      calls: [],
    });
  });

  it("ignores events other than push", async () => {
    const response = await route.fetch(github.deliver("issues", "{}"));

    expect(response.status).toBe(IGNORED);
  });

  it("refuses a delivery with no signature", async () => {
    const request = github.push(
      { branch: BRANCH, commits: [{ added: [PLAN] }] },
      { signature: null },
    );

    const response = await route.fetch(request);

    expect({ status: response.status, calls: changes.calls }).toEqual({
      status: UNAUTHORIZED,
      calls: [],
    });
  });

  it("refuses a delivery signed with another secret", async () => {
    const forger = new FakeGitHubWebhook("another-secret-of-at-least-32-chars");

    const response = await route.fetch(
      forger.push({ branch: BRANCH, commits: [{ added: [PLAN] }] }),
    );

    expect({ status: response.status, calls: changes.calls }).toEqual({
      status: UNAUTHORIZED,
      calls: [],
    });
  });

  it("refuses a request that is not a POST", async () => {
    const response = await route.fetch(new Request(WEBHOOK_URL));

    expect(response.status).toBe(NOT_ALLOWED);
  });

  it("refuses a form-encoded delivery", async () => {
    const request = github.deliver("push", "payload=%7B%7D", { contentType: FORM_TYPE });

    const response = await route.fetch(request);

    expect(response.status).toBe(UNSUPPORTED);
  });

  it("refuses a signed push whose body is not a push payload", async () => {
    const response = await route.fetch(github.deliver("push", JSON.stringify({ ref: 1 })));

    expect(response.status).toBe(BAD_REQUEST);
  });

  it("reconciles the whole index after a force push", async () => {
    const request = github.push({ branch: BRANCH, forced: true, commits: [{ added: [PLAN] }] });

    await route.fetch(request);

    expect({ runs: reconciler.runs, calls: changes.calls }).toEqual({ runs: 1, calls: [] });
  });

  it("reconciles the whole index when GitHub left commits out of the payload", async () => {
    const commits = Array.from({ length: MAX_PUSH_COMMITS }, () => ({ modified: [PLAN] }));

    await route.fetch(github.push({ branch: BRANCH, commits }));

    expect({ runs: reconciler.runs, calls: changes.calls }).toEqual({ runs: 1, calls: [] });
  });
});
