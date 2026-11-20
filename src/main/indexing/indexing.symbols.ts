import type { ServiceIdentifier } from "inversify";
import type { PushedNoteIndexer } from "../../application/use-cases/index-pushed-note";
import type { QueueNoteChanges } from "../../application/use-cases/queue-note-changes";
import type { ReconcileIndex } from "../../application/use-cases/reconcile-index";

export const INDEXING = {
  queueChanges: Symbol.for("QueueNoteChanges") as ServiceIdentifier<QueueNoteChanges>,
  indexPushed: Symbol.for("IndexPushedNote") as ServiceIdentifier<PushedNoteIndexer>,
  reconcile: Symbol.for("ReconcileIndex") as ServiceIdentifier<ReconcileIndex>,
} as const;
