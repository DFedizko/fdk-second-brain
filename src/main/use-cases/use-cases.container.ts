import { ContainerModule, type ServiceIdentifier } from "inversify";
import { BACKGROUND } from "../../adapters/outbound/background/background.symbols";
import { CLOCK } from "../../adapters/outbound/clock/clock.symbols";
import { GITHUB } from "../../adapters/outbound/github/github.symbols";
import type { BackgroundTasks } from "../../application/ports/background-tasks";
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
const SYNCED: [
  ServiceIdentifier<NoteRepository>,
  ServiceIdentifier<IndexSync>,
  ServiceIdentifier<BackgroundTasks>,
] = [GITHUB.noteRepository, SEARCH.indexSync, BACKGROUND.tasks];
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
      (r: NoteRepository, sync: IndexSync, later: BackgroundTasks) =>
        new IndexedChange(new WriteNote(r), SAVED, sync, later),
      SYNCED,
    )
    .inSingletonScope();
  bind(USE_CASES.editNote)
    .toResolvedValue(
      (r: NoteRepository, sync: IndexSync, later: BackgroundTasks) =>
        new IndexedChange(new EditNote(r), SAVED, sync, later),
      SYNCED,
    )
    .inSingletonScope();
  bind(USE_CASES.deleteNote)
    .toResolvedValue(
      (r: NoteRepository, sync: IndexSync, later: BackgroundTasks) =>
        new IndexedChange(new DeleteNote(r), new DeletedNotePaths(), sync, later),
      SYNCED,
    )
    .inSingletonScope();
  bind(USE_CASES.moveNote)
    .toResolvedValue(
      (r: NoteRepository, sync: IndexSync, later: BackgroundTasks) =>
        new IndexedChange(new MoveNote(r), new MovedNotePaths(), sync, later),
      SYNCED,
    )
    .inSingletonScope();
  bind(USE_CASES.saveIdea)
    .toResolvedValue(
      (r: NoteRepository, clock: Clock, sync: IndexSync, later: BackgroundTasks) =>
        new IndexedChange(new SaveIdea(r, clock), SAVED, sync, later),
      [GITHUB.noteRepository, CLOCK.clock, SEARCH.indexSync, BACKGROUND.tasks],
    )
    .inSingletonScope();
});
