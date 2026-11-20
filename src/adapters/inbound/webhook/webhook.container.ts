import { ContainerModule, type ServiceIdentifier } from "inversify";
import type { BackgroundTasks } from "../../../application/ports/background-tasks";
import type { WebhookSettings } from "../../../shared/contracts/webhook-settings";
import { BACKGROUND } from "../../outbound/background/background.symbols";
import { GitHubWebhookRoute, type ChangeQueue, type Reconciler } from "./github-webhook-route";
import { WEBHOOK } from "./webhook.symbols";
import { WebhookSignature, type SignatureCheck } from "./webhook-signature";

export interface WebhookWiring extends WebhookSettings {
  readonly branch: string;
  readonly changes: ServiceIdentifier<ChangeQueue>;
  readonly reconciler: ServiceIdentifier<Reconciler>;
}

export function createWebhookModule(wiring: WebhookWiring): ContainerModule {
  return new ContainerModule(({ bind }) => {
    bind(WEBHOOK.signature).toConstantValue(new WebhookSignature({ secret: wiring.secret }));
    bind(WEBHOOK.route)
      .toResolvedValue(
        (
          signature: SignatureCheck,
          changes: ChangeQueue,
          reconciler: Reconciler,
          background: BackgroundTasks,
        ) => new GitHubWebhookRoute(signature, changes, reconciler, background, wiring.branch),
        [WEBHOOK.signature, wiring.changes, wiring.reconciler, BACKGROUND.tasks],
      )
      .inSingletonScope();
  });
}
