import type { Reconciler } from "../../../../../src/adapters/inbound/webhook/github-webhook-route";
import type { ReconcileResult } from "../../../../../src/application/use-cases/reconcile-index";

export class FailingReconciler implements Reconciler {
    constructor(private readonly error: Error) {}

    async execute(): Promise<ReconcileResult> {
        throw this.error;
    }
}
