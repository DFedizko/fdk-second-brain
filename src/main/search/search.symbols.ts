import type { ServiceIdentifier } from "inversify";
import type { MarkdownChunker } from "../../domain/markdown-chunker";
import type { IndexNote } from "../../application/use-cases/index-note";
import type { IndexSync } from "../../application/use-cases/note-index-sync";
import type { RemoveNoteIndex } from "../../application/use-cases/remove-note-index";
import type { SearchNotes } from "../../application/use-cases/search-notes";

export const SEARCH = {
  chunker: Symbol.for("MarkdownChunker") as ServiceIdentifier<MarkdownChunker>,
  indexNote: Symbol.for("IndexNote") as ServiceIdentifier<IndexNote>,
  removeNoteIndex: Symbol.for("RemoveNoteIndex") as ServiceIdentifier<RemoveNoteIndex>,
  searchNotes: Symbol.for("SearchNotes") as ServiceIdentifier<SearchNotes>,
  indexSync: Symbol.for("IndexSync") as ServiceIdentifier<IndexSync>,
} as const;
