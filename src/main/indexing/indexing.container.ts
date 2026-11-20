import { ContainerModule } from "inversify";
import { D1_SEARCH_SYMBOLS } from "../../adapters/outbound/d1-search/d1-search.symbols";
import { GITHUB } from "../../adapters/outbound/github/github.symbols";
import { QUEUE } from "../../adapters/outbound/queue/queue.symbols";
import type { BranchHead } from "../../application/ports/branch-head";
import type { NoteCatalog } from "../../application/ports/note-catalog";
import type { PathQueue } from "../../application/ports/path-queue";
import type { SearchIndex } from "../../application/ports/search-index";
import type { NoteIndexer } from "../../application/use-cases/index-note";
import { IndexNoteFactory } from "../../application/use-cases/index-note-factory";
import {
  IndexPushedNote,
  type IndexerFactory,
} from "../../application/use-cases/index-pushed-note";
import type { MarkdownChunker } from "../../domain/markdown-chunker";
import { QueueNoteChanges } from "../../application/use-cases/queue-note-changes";
import { ReconcileIndex } from "../../application/use-cases/reconcile-index";
import { SEARCH } from "../search/search.symbols";
import { INDEXING } from "./indexing.symbols";

export const indexingModule = new ContainerModule(({ bind }) => {
  bind(INDEXING.queueChanges)
    .toResolvedValue((queue: PathQueue) => new QueueNoteChanges(queue), [QUEUE.pathQueue])
    .inSingletonScope();
  bind(INDEXING.indexerFactory)
    .toResolvedValue(
      (index: SearchIndex, chunker: MarkdownChunker) => new IndexNoteFactory(index, chunker),
      [D1_SEARCH_SYMBOLS.SearchIndex, SEARCH.chunker],
    )
    .inSingletonScope();
  bind(INDEXING.indexPushed)
    .toResolvedValue(
      (head: BranchHead, indexers: IndexerFactory, indexer: NoteIndexer) =>
        new IndexPushedNote(head, indexers, indexer),
      [GITHUB.branchHead, INDEXING.indexerFactory, SEARCH.indexNote],
    )
    .inSingletonScope();
  bind(INDEXING.reconcile)
    .toResolvedValue(
      (notes: NoteCatalog, index: NoteCatalog, queue: PathQueue) =>
        new ReconcileIndex(notes, index, queue),
      [GITHUB.noteCatalog, D1_SEARCH_SYMBOLS.IndexManifest, QUEUE.pathQueue],
    )
    .inSingletonScope();
});
