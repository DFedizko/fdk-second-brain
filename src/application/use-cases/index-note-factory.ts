import type { MarkdownChunker } from "../../domain/markdown-chunker";
import type { NoteLookup } from "../ports/note-lookup";
import type { SearchIndex } from "../ports/search-index";
import { IndexNote, type NoteIndexer } from "./index-note";
import type { IndexerFactory } from "./index-pushed-note";

export class IndexNoteFactory implements IndexerFactory {
    constructor(
        private readonly index: SearchIndex,
        private readonly chunker: MarkdownChunker,
    ) {}

    over(notes: NoteLookup): NoteIndexer {
        return new IndexNote(this.index, notes, this.chunker);
    }
}
