import type { Reconciler } from "../../../../../src/adapters/inbound/webhook/github-webhook-route";
import type { ReconcileResult } from "../../../../../src/application/use-cases/reconcile-index";

const NOTHING_FIXED: ReconcileResult = { missing: 0, stale: 0, orphaned: 0 };

export class SpyReconciler implements Reconciler {
  runs = 0;

  async execute(): Promise<ReconcileResult> {
    this.runs += 1;
    return NOTHING_FIXED;
  }
}
