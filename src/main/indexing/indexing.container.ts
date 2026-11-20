import { ContainerModule } from "inversify";
import { D1_SEARCH_SYMBOLS } from "../../adapters/outbound/d1-search/d1-search.symbols";
import { GITHUB } from "../../adapters/outbound/github/github.symbols";
import { QUEUE } from "../../adapters/outbound/queue/queue.symbols";
import type { NoteCatalog } from "../../application/ports/note-catalog";
import type { PathQueue } from "../../application/ports/path-queue";
import { QueueNoteChanges } from "../../application/use-cases/queue-note-changes";
import { ReconcileIndex } from "../../application/use-cases/reconcile-index";
import { INDEXING } from "./indexing.symbols";

export const indexingModule = new ContainerModule(({ bind }) => {
  bind(INDEXING.queueChanges)
    .toResolvedValue((queue: PathQueue) => new QueueNoteChanges(queue), [QUEUE.pathQueue])
    .inSingletonScope();
  bind(INDEXING.reconcile)
    .toResolvedValue(
      (notes: NoteCatalog, index: NoteCatalog, queue: PathQueue) =>
        new ReconcileIndex(notes, index, queue),
      [GITHUB.noteCatalog, D1_SEARCH_SYMBOLS.IndexManifest, QUEUE.pathQueue],
    )
    .inSingletonScope();
});
