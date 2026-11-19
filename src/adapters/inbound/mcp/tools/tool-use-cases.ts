import type { ServiceIdentifier } from "inversify";
import type { DeleteNote } from "../../../../application/use-cases/delete-note";
import type { EditNote } from "../../../../application/use-cases/edit-note";
import type { ListNotes } from "../../../../application/use-cases/list-notes";
import type { MoveNote } from "../../../../application/use-cases/move-note";
import type { ReadNote } from "../../../../application/use-cases/read-note";
import type { ReadSection } from "../../../../application/use-cases/read-section";
import type { SaveIdea } from "../../../../application/use-cases/save-idea";
import type { WriteNote } from "../../../../application/use-cases/write-note";

export interface ToolUseCases {
  readonly listNotes: ServiceIdentifier<ListNotes>;
  readonly readNote: ServiceIdentifier<ReadNote>;
  readonly readSection: ServiceIdentifier<ReadSection>;
  readonly writeNote: ServiceIdentifier<WriteNote>;
  readonly editNote: ServiceIdentifier<EditNote>;
  readonly deleteNote: ServiceIdentifier<DeleteNote>;
  readonly moveNote: ServiceIdentifier<MoveNote>;
  readonly saveIdea: ServiceIdentifier<SaveIdea>;
}
