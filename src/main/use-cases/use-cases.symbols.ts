import type { ServiceIdentifier } from "inversify";
import type { DeleteNote } from "../../application/use-cases/delete-note";
import type { EditNote } from "../../application/use-cases/edit-note";
import type { ListNotes } from "../../application/use-cases/list-notes";
import type { MoveNote } from "../../application/use-cases/move-note";
import type { ReadNote } from "../../application/use-cases/read-note";
import type { ReadSection } from "../../application/use-cases/read-section";
import type { SaveIdea } from "../../application/use-cases/save-idea";
import type { WriteNote } from "../../application/use-cases/write-note";

export const USE_CASES = {
  listNotes: Symbol.for("ListNotes") as ServiceIdentifier<ListNotes>,
  readNote: Symbol.for("ReadNote") as ServiceIdentifier<ReadNote>,
  readSection: Symbol.for("ReadSection") as ServiceIdentifier<ReadSection>,
  writeNote: Symbol.for("WriteNote") as ServiceIdentifier<WriteNote>,
  editNote: Symbol.for("EditNote") as ServiceIdentifier<EditNote>,
  deleteNote: Symbol.for("DeleteNote") as ServiceIdentifier<DeleteNote>,
  moveNote: Symbol.for("MoveNote") as ServiceIdentifier<MoveNote>,
  saveIdea: Symbol.for("SaveIdea") as ServiceIdentifier<SaveIdea>,
} as const;
