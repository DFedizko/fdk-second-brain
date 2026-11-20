import type {
  QueueNoteChangesInput,
  QueueNoteChangesResult,
} from "../../../application/use-cases/queue-note-changes";
import type { BackgroundTasks } from "../../../application/ports/background-tasks";
import type { IndexFailureLog } from "../../../application/ports/index-failure-log";
import type { ReconcileResult } from "../../../application/use-cases/reconcile-index";
import { PUSH_SCHEMA, PushEvent } from "./push-event";
import type { SignatureCheck } from "./webhook-signature";

export { MAX_PUSH_COMMITS } from "./push-event";

export const WEBHOOK_PATH = "/webhooks/github";
export const RECONCILE_LABEL = "full reconciliation after a push";
export const QUEUE_LABEL = "queueing the paths of a push";

const POST = "POST";
const PUSH = "push";
const JSON_TYPE = "application/json";
const EVENT_HEADER = "X-GitHub-Event";
const SIGNATURE_HEADER = "X-Hub-Signature-256";
const CONTENT_TYPE = "Content-Type";
const ALLOW = "Allow";
const STATUS = {
  accepted: 202,
  ignored: 204,
  badRequest: 400,
  unauthorized: 401,
  notAllowed: 405,
  unsupported: 415,
} as const;

export interface ChangeQueue {
  execute(input: QueueNoteChangesInput): Promise<QueueNoteChangesResult>;
}

export interface Reconciler {
  execute(after?: string): Promise<ReconcileResult>;
}

export interface FullReconcile {
  readonly reconciler: Reconciler;
  readonly background: BackgroundTasks;
  readonly log: IndexFailureLog;
}

export class GitHubWebhookRoute {
  constructor(
    private readonly signature: SignatureCheck,
    private readonly changes: ChangeQueue,
    private readonly fallback: FullReconcile,
    private readonly branch: string,
  ) {}

  async fetch(request: Request): Promise<Response> {
    if (request.method !== POST) return this.reply(STATUS.notAllowed, { [ALLOW]: POST });
    if (!this.isJson(request)) return this.reply(STATUS.unsupported);
    const body = await request.text();
    const signed = await this.signature.verify(body, request.headers.get(SIGNATURE_HEADER));
    if (!signed) return this.reply(STATUS.unauthorized);
    if (request.headers.get(EVENT_HEADER) !== PUSH) return this.reply(STATUS.ignored);
    const push = this.readPush(body);
    if (push === null) return this.reply(STATUS.badRequest);
    return this.handlePush(push);
  }

  private async handlePush(push: PushEvent): Promise<Response> {
    if (!push.isTo(this.branch) || push.deletesBranch) return this.reply(STATUS.ignored);
    if (push.listsEveryChange) await this.queueChanges(push);
    else this.fallback.background.runInBackground(() => this.reconcile(push.headCommit));
    return this.reply(STATUS.accepted);
  }

  private async queueChanges(push: PushEvent): Promise<void> {
    await this.changes
      .execute({ paths: push.changedPaths(), commit: push.headCommit })
      .catch((error: unknown) => this.reconcileInstead(push, error));
  }

  private reconcileInstead(push: PushEvent, error: unknown): void {
    this.fallback.log.report({ path: QUEUE_LABEL, error });
    this.fallback.background.runInBackground(() => this.reconcile(push.headCommit));
  }

  private async reconcile(after: string): Promise<void> {
    await this.fallback.reconciler.execute(after).then(
      () => undefined,
      (error: unknown) => this.fallback.log.report({ path: RECONCILE_LABEL, error }),
    );
  }

  private isJson(request: Request): boolean {
    return (request.headers.get(CONTENT_TYPE) ?? "").startsWith(JSON_TYPE);
  }

  private readPush(body: string): PushEvent | null {
    const parsed = PUSH_SCHEMA.safeParse(this.parseJson(body));
    return parsed.success ? new PushEvent(parsed.data) : null;
  }

  private parseJson(body: string): unknown {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }

  private reply(status: number, headers: Record<string, string> = {}): Response {
    return new Response(null, { status, headers });
  }
}
