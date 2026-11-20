import { ContainerModule, type ServiceIdentifier } from "inversify";
import { CLOCK } from "../../adapters/outbound/clock/clock.symbols";
import { GITHUB } from "../../adapters/outbound/github/github.symbols";
import type { Clock } from "../../application/ports/clock";
import type { NoteRepository } from "../../application/ports/note-repository";
import {
  DeletedNotePaths,
  MovedNotePaths,
  SavedNotePaths,
} from "../../application/use-cases/changed-paths";
import { DeleteNote } from "../../application/use-cases/delete-note";
import { EditNote } from "../../application/use-cases/edit-note";
import { IndexedChange } from "../../application/use-cases/indexed-change";
import { ListNotes } from "../../application/use-cases/list-notes";
import { MoveNote } from "../../application/use-cases/move-note";
import type { IndexSync } from "../../application/use-cases/note-index-sync";
import { ReadNote } from "../../application/use-cases/read-note";
import { ReadSection } from "../../application/use-cases/read-section";
import { SaveIdea } from "../../application/use-cases/save-idea";
import { WriteNote } from "../../application/use-cases/write-note";
import { SEARCH } from "../search/search.symbols";
import { USE_CASES } from "./use-cases.symbols";

const REPOSITORY: [ServiceIdentifier<NoteRepository>] = [GITHUB.noteRepository];
const SYNCED: [ServiceIdentifier<NoteRepository>, ServiceIdentifier<IndexSync>] = [
  GITHUB.noteRepository,
  SEARCH.indexSync,
];
const SAVED = new SavedNotePaths();

export const useCasesModule = new ContainerModule(({ bind }) => {
  bind(USE_CASES.listNotes)
    .toResolvedValue((r: NoteRepository) => new ListNotes(r), REPOSITORY)
    .inSingletonScope();
  bind(USE_CASES.readNote)
    .toResolvedValue((r: NoteRepository) => new ReadNote(r), REPOSITORY)
    .inSingletonScope();
  bind(USE_CASES.readSection)
    .toResolvedValue((r: NoteRepository) => new ReadSection(r), REPOSITORY)
    .inSingletonScope();
  bind(USE_CASES.writeNote)
    .toResolvedValue(
      (r: NoteRepository, sync: IndexSync) => new IndexedChange(new WriteNote(r), SAVED, sync),
      SYNCED,
    )
    .inSingletonScope();
  bind(USE_CASES.editNote)
    .toResolvedValue(
      (r: NoteRepository, sync: IndexSync) => new IndexedChange(new EditNote(r), SAVED, sync),
      SYNCED,
    )
    .inSingletonScope();
  bind(USE_CASES.deleteNote)
    .toResolvedValue(
      (r: NoteRepository, sync: IndexSync) =>
        new IndexedChange(new DeleteNote(r), new DeletedNotePaths(), sync),
      SYNCED,
    )
    .inSingletonScope();
  bind(USE_CASES.moveNote)
    .toResolvedValue(
      (r: NoteRepository, sync: IndexSync) =>
        new IndexedChange(new MoveNote(r), new MovedNotePaths(), sync),
      SYNCED,
    )
    .inSingletonScope();
  bind(USE_CASES.saveIdea)
    .toResolvedValue(
      (r: NoteRepository, clock: Clock, sync: IndexSync) =>
        new IndexedChange(new SaveIdea(r, clock), SAVED, sync),
      [GITHUB.noteRepository, CLOCK.clock, SEARCH.indexSync],
    )
    .inSingletonScope();
});
