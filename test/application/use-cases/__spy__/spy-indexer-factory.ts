import type { NoteLookup } from "../../../../src/application/ports/note-lookup";
import type { IndexerFactory } from "../../../../src/application/use-cases/index-pushed-note";
import type { NoteIndexer } from "../../../../src/application/use-cases/index-note";
import { SpyNoteIndexer } from "./spy-note-indexer";

export class SpyIndexerFactory implements IndexerFactory {
  readonly lookups: NoteLookup[] = [];
  readonly indexer = new SpyNoteIndexer();

  over(notes: NoteLookup): NoteIndexer {
    this.lookups.push(notes);
    return this.indexer;
  }
}
