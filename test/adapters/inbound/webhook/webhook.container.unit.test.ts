import { Container } from "inversify";
import { GitHubWebhookRoute } from "../../../../src/adapters/inbound/webhook/github-webhook-route";
import { createWebhookModule } from "../../../../src/adapters/inbound/webhook/webhook.container";
import { WEBHOOK } from "../../../../src/adapters/inbound/webhook/webhook.symbols";
import { FakeGitHubWebhook } from "./__fake__/fake-github-webhook";
import { BACKGROUND } from "../../../../src/adapters/outbound/background/background.symbols";
import { ManualBackgroundTasks } from "../../../application/use-cases/__fake__/manual-background-tasks";
import { SpyChangeQueue } from "./__spy__/spy-change-queue";
import { SpyReconciler } from "./__spy__/spy-reconciler";

const SECRET = "webhook-secret-of-at-least-32-chars";
const BRANCH = "notes/main";
const PLAN = "projects/plan.md";
const CHANGES = Symbol.for("TestChangeQueue");
const RECONCILER = Symbol.for("TestReconciler");

let changes: SpyChangeQueue;

function buildContainer(): Container {
  const container = new Container();
  container.bind(CHANGES).toConstantValue(changes);
  container.bind(RECONCILER).toConstantValue(new SpyReconciler());
  container.bind(BACKGROUND.tasks).toConstantValue(new ManualBackgroundTasks());
  container.load(
    createWebhookModule({
      secret: SECRET,
      branch: BRANCH,
      changes: CHANGES,
      reconciler: RECONCILER,
    }),
  );
  return container;
}

beforeEach(() => {
  changes = new SpyChangeQueue();
});

describe("createWebhookModule", () => {
  it("binds the GitHub webhook route", () => {
    const route = buildContainer().get(WEBHOOK.route);

    expect(route).toBeInstanceOf(GitHubWebhookRoute);
  });

  it("checks signatures with the configured secret and branch", async () => {
    const request = new FakeGitHubWebhook(SECRET).push({
      branch: BRANCH,
      commits: [{ added: [PLAN] }],
    });

    await buildContainer().get(WEBHOOK.route).fetch(request);

    expect(changes.calls).toEqual([[PLAN]]);
  });
});
