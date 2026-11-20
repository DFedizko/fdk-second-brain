import { buildPushPayload, type PushSpec } from "./push-payload";

export const WEBHOOK_URL = "https://second-brain.example/webhooks/github";
const POST = "POST";
const JSON_TYPE = "application/json";
const SIGNATURE_PREFIX = "sha256=";
const HASH = "sha256";
const HEX = "hex";
const DELIVERY_ID = "72d3162e-cc78-11e3-81ab-4c9367dc0958";
const HOOK_ID = "292430182";
const TARGET_ID = "79929171";
const USER_AGENT = "GitHub-Hookshot/044aadd";
const PING_ZEN = "Design for failure.";

export interface DeliveryOptions {
  readonly signature?: string | null;
  readonly contentType?: string;
}

export class FakeGitHubWebhook {
  constructor(
    private readonly secret: string,
    private readonly url: string = WEBHOOK_URL,
  ) {}

  push(spec: PushSpec, options: DeliveryOptions = {}): Request {
    return this.deliver("push", JSON.stringify(buildPushPayload(spec)), options);
  }

  ping(options: DeliveryOptions = {}): Request {
    const body = JSON.stringify({ zen: PING_ZEN, hook_id: Number(HOOK_ID), hook: { id: 1 } });
    return this.deliver("ping", body, options);
  }

  deliver(event: string, body: string | Uint8Array, options: DeliveryOptions = {}): Request {
    const signature = options.signature === undefined ? this.sign(body) : options.signature;
    const headers = new Headers({
      "Content-Type": options.contentType ?? JSON_TYPE,
      "User-Agent": USER_AGENT,
      "X-GitHub-Delivery": DELIVERY_ID,
      "X-GitHub-Event": event,
      "X-GitHub-Hook-ID": HOOK_ID,
      "X-GitHub-Hook-Installation-Target-ID": TARGET_ID,
      "X-GitHub-Hook-Installation-Target-Type": "repository",
    });
    if (signature !== null) headers.set("X-Hub-Signature-256", signature);
    return new Request(this.url, { method: POST, headers, body });
  }

  sign(body: string | Uint8Array): string {
    const hasher = new Bun.CryptoHasher(HASH, this.secret);
    hasher.update(body);
    return SIGNATURE_PREFIX + hasher.digest(HEX);
  }
}
