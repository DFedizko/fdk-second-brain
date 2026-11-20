import type { ServiceIdentifier } from "inversify";
import type { DeleteNoteInput } from "../../application/use-cases/delete-note";
import type { EditNoteInput } from "../../application/use-cases/edit-note";
import type { NoteChange } from "../../application/use-cases/indexed-change";
import type { ListNotes } from "../../application/use-cases/list-notes";
import type { MoveNoteInput } from "../../application/use-cases/move-note";
import type { MovedNoteView, NoteView } from "../../application/use-cases/note-view";
import type { ReadNote } from "../../application/use-cases/read-note";
import type { ReadSection } from "../../application/use-cases/read-section";
import type { SaveIdeaInput } from "../../application/use-cases/save-idea";
import type { WriteNoteInput } from "../../application/use-cases/write-note";

type Change<Input, Output = NoteView> = ServiceIdentifier<NoteChange<Input, Output>>;

export const USE_CASES = {
  listNotes: Symbol.for("ListNotes") as ServiceIdentifier<ListNotes>,
  readNote: Symbol.for("ReadNote") as ServiceIdentifier<ReadNote>,
  readSection: Symbol.for("ReadSection") as ServiceIdentifier<ReadSection>,
  writeNote: Symbol.for("WriteNote") as Change<WriteNoteInput>,
  editNote: Symbol.for("EditNote") as Change<EditNoteInput>,
  deleteNote: Symbol.for("DeleteNote") as Change<DeleteNoteInput, void>,
  moveNote: Symbol.for("MoveNote") as Change<MoveNoteInput, MovedNoteView>,
  saveIdea: Symbol.for("SaveIdea") as Change<SaveIdeaInput>,
} as const;
