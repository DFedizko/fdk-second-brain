import { ContainerModule, type ServiceIdentifier } from "inversify";
import { D1_SEARCH_SYMBOLS } from "../../adapters/outbound/d1-search/d1-search.symbols";
import { GITHUB } from "../../adapters/outbound/github/github.symbols";
import { LOGGING } from "../../adapters/outbound/logging/logging.symbols";
import type { IndexFailureLog } from "../../application/ports/index-failure-log";
import type { NoteRepository } from "../../application/ports/note-repository";
import type { SearchIndex } from "../../application/ports/search-index";
import { IndexNote } from "../../application/use-cases/index-note";
import { NoteIndexSync } from "../../application/use-cases/note-index-sync";
import { RemoveNoteIndex } from "../../application/use-cases/remove-note-index";
import { SearchNotes } from "../../application/use-cases/search-notes";
import { MarkdownChunker } from "../../domain/markdown-chunker";
import { SEARCH } from "./search.symbols";

const INDEX: ServiceIdentifier<SearchIndex> = D1_SEARCH_SYMBOLS.SearchIndex;
const REPOSITORY: ServiceIdentifier<NoteRepository> = GITHUB.noteRepository;

export const searchModule = new ContainerModule(({ bind }) => {
    bind(SEARCH.chunker)
        .toResolvedValue(() => new MarkdownChunker())
        .inSingletonScope();
    bind(SEARCH.indexNote)
        .toResolvedValue(
            (index: SearchIndex, notes: NoteRepository, chunker: MarkdownChunker) =>
                new IndexNote(index, notes, chunker),
            [INDEX, REPOSITORY, SEARCH.chunker],
        )
        .inSingletonScope();
    bind(SEARCH.removeNoteIndex)
        .toResolvedValue((indexer: IndexNote) => new RemoveNoteIndex(indexer), [SEARCH.indexNote])
        .inSingletonScope();
    bind(SEARCH.searchNotes)
        .toResolvedValue((index: SearchIndex) => new SearchNotes(index), [INDEX])
        .inSingletonScope();
    bind(SEARCH.indexSync)
        .toResolvedValue(
            (indexer: IndexNote, remover: RemoveNoteIndex, log: IndexFailureLog) =>
                new NoteIndexSync(indexer, remover, log),
            [SEARCH.indexNote, SEARCH.removeNoteIndex, LOGGING.indexFailureLog],
        )
        .inSingletonScope();
});
