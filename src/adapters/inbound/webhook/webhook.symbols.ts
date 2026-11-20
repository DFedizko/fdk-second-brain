import type { ServiceIdentifier } from "inversify";
import type { GitHubWebhookRoute } from "./github-webhook-route";
import type { SignatureCheck } from "./webhook-signature";

export const WEBHOOK = {
  signature: Symbol.for("WebhookSignature") as ServiceIdentifier<SignatureCheck>,
  route: Symbol.for("GitHubWebhookRoute") as ServiceIdentifier<GitHubWebhookRoute>,
} as const;
