import { ContainerModule } from "inversify";
import { CLOCK } from "../../adapters/outbound/clock/clock.symbols";
import { GITHUB } from "../../adapters/outbound/github/github.symbols";
import type { Clock } from "../../application/ports/clock";
import type { NoteRepository } from "../../application/ports/note-repository";
import { DeleteNote } from "../../application/use-cases/delete-note";
import { EditNote } from "../../application/use-cases/edit-note";
import { ListNotes } from "../../application/use-cases/list-notes";
import { MoveNote } from "../../application/use-cases/move-note";
import { ReadNote } from "../../application/use-cases/read-note";
import { ReadSection } from "../../application/use-cases/read-section";
import { SaveIdea } from "../../application/use-cases/save-idea";
import { WriteNote } from "../../application/use-cases/write-note";
import { USE_CASES } from "./use-cases.symbols";

const REPOSITORY: [symbol] = [GITHUB.noteRepository as symbol];

export const useCasesModule = new ContainerModule(({ bind }) => {
  bind(USE_CASES.listNotes).toResolvedValue((r: NoteRepository) => new ListNotes(r), REPOSITORY);
  bind(USE_CASES.readNote).toResolvedValue((r: NoteRepository) => new ReadNote(r), REPOSITORY);
  bind(USE_CASES.readSection).toResolvedValue(
    (r: NoteRepository) => new ReadSection(r),
    REPOSITORY,
  );
  bind(USE_CASES.writeNote).toResolvedValue((r: NoteRepository) => new WriteNote(r), REPOSITORY);
  bind(USE_CASES.editNote).toResolvedValue((r: NoteRepository) => new EditNote(r), REPOSITORY);
  bind(USE_CASES.deleteNote).toResolvedValue((r: NoteRepository) => new DeleteNote(r), REPOSITORY);
  bind(USE_CASES.moveNote).toResolvedValue((r: NoteRepository) => new MoveNote(r), REPOSITORY);
  bind(USE_CASES.saveIdea).toResolvedValue(
    (r: NoteRepository, clock: Clock) => new SaveIdea(r, clock),
    [GITHUB.noteRepository, CLOCK.clock],
  );
});
