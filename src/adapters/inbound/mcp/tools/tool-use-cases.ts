import type { ServiceIdentifier } from "inversify";
import type { DeleteNoteInput } from "../../../../application/use-cases/delete-note";
import type { EditNoteInput } from "../../../../application/use-cases/edit-note";
import type { ListNotesInput } from "../../../../application/use-cases/list-notes";
import type { MoveNoteInput } from "../../../../application/use-cases/move-note";
import type { MovedNoteView, NoteView } from "../../../../application/use-cases/note-view";
import type { ReadNoteInput } from "../../../../application/use-cases/read-note";
import type { ReadSectionInput, SectionView } from "../../../../application/use-cases/read-section";
import type { SaveIdeaInput } from "../../../../application/use-cases/save-idea";
import type {
  SearchNotesInput,
  SearchResult,
} from "../../../../application/use-cases/search-notes";
import type { WriteNoteInput } from "../../../../application/use-cases/write-note";
import type { UseCase } from "./use-case";

type Driven<Input, Output = NoteView> = ServiceIdentifier<UseCase<Input, Output>>;

export interface ToolUseCases {
  readonly listNotes: Driven<ListNotesInput, string[]>;
  readonly readNote: Driven<ReadNoteInput>;
  readonly readSection: Driven<ReadSectionInput, SectionView>;
  readonly writeNote: Driven<WriteNoteInput>;
  readonly editNote: Driven<EditNoteInput>;
  readonly deleteNote: Driven<DeleteNoteInput, void>;
  readonly moveNote: Driven<MoveNoteInput, MovedNoteView>;
  readonly saveIdea: Driven<SaveIdeaInput>;
  readonly searchNotes: Driven<SearchNotesInput, SearchResult[]>;
}
