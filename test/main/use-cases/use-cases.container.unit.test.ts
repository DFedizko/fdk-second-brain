import { Container, type ServiceIdentifier } from "inversify";
import { BACKGROUND } from "../../../src/adapters/outbound/background/background.symbols";
import { CLOCK } from "../../../src/adapters/outbound/clock/clock.symbols";
import { GITHUB } from "../../../src/adapters/outbound/github/github.symbols";
import { IndexedChange } from "../../../src/application/use-cases/indexed-change";
import { ListNotes } from "../../../src/application/use-cases/list-notes";
import { ReadNote } from "../../../src/application/use-cases/read-note";
import { ReadSection } from "../../../src/application/use-cases/read-section";
import { NotePath } from "../../../src/domain/note-path";
import { SEARCH } from "../../../src/main/search/search.symbols";
import { useCasesModule } from "../../../src/main/use-cases/use-cases.container";
import { USE_CASES } from "../../../src/main/use-cases/use-cases.symbols";
import { InMemoryNoteRepo } from "../../application/__fake__/in-memory-note-repo";
import { ManualBackgroundTasks } from "../../application/use-cases/__fake__/manual-background-tasks";
import { SpyIndexSync } from "../../application/use-cases/__spy__/spy-index-sync";
import { FixedClock } from "../../__stub__/fixed-clock";

type UseCaseClass = new (...args: never[]) => object;

const NOW = new Date("2026-11-19T10:30:00.000Z");
const PLAN = "projects/plan.md";
const ARCHIVED = "archive/plan.md";
const IDEA = "ideas/2026-11-19-offline-mode.md";
const PLAN_TEXT = "# Plan\n\nShip it.\n";

const BINDINGS: ReadonlyArray<[keyof typeof USE_CASES, UseCaseClass]> = [
  ["listNotes", ListNotes],
  ["readNote", ReadNote],
  ["readSection", ReadSection],
  ["writeNote", IndexedChange],
  ["editNote", IndexedChange],
  ["deleteNote", IndexedChange],
  ["moveNote", IndexedChange],
  ["saveIdea", IndexedChange],
];

let notes: InMemoryNoteRepo;
let sync: SpyIndexSync;
let background: ManualBackgroundTasks;

function buildContainer(): Container {
  const container = new Container();
  container.bind(GITHUB.noteRepository).toConstantValue(notes);
  container.bind(CLOCK.clock).toConstantValue(new FixedClock(NOW));
  container.bind(SEARCH.indexSync).toConstantValue(sync);
  container.bind(BACKGROUND.tasks).toConstantValue(background);
  container.load(useCasesModule);
  return container;
}

beforeEach(async () => {
  notes = new InMemoryNoteRepo();
  sync = new SpyIndexSync();
  background = new ManualBackgroundTasks();
  await notes.create(NotePath.of(PLAN), PLAN_TEXT);
});

describe("useCasesModule", () => {
  it.each(BINDINGS)("binds %s to its use case", (key, useCase) => {
    const id: ServiceIdentifier<object> = USE_CASES[key];

    const resolved = buildContainer().get(id);

    expect(resolved).toBeInstanceOf(useCase);
  });

  it("indexes a written note", async () => {
    await buildContainer().get(USE_CASES.writeNote).execute({ path: ARCHIVED, content: "x" });

    await background.runQueued();
    expect(sync.changes).toEqual([
      { indexed: [expect.objectContaining({ path: ARCHIVED })], removed: [] },
    ]);
  });

  it("indexes an edited note", async () => {
    const edit = { path: PLAN, passage: "Ship it.", replacement: "Done." };

    await buildContainer().get(USE_CASES.editNote).execute(edit);

    await background.runQueued();
    expect(sync.changes).toEqual([
      { indexed: [expect.objectContaining({ path: PLAN })], removed: [] },
    ]);
  });

  it("removes a deleted note from the index", async () => {
    await buildContainer().get(USE_CASES.deleteNote).execute({ path: PLAN });

    await background.runQueued();
    expect(sync.changes).toEqual([{ indexed: [], removed: [PLAN] }]);
  });

  it("moves a note in the index", async () => {
    await buildContainer().get(USE_CASES.moveNote).execute({ from: PLAN, to: ARCHIVED });

    await background.runQueued();
    expect(sync.changes).toEqual([
      { indexed: [expect.objectContaining({ path: ARCHIVED })], removed: [PLAN] },
    ]);
  });

  it("indexes a saved idea", async () => {
    const idea = { title: "Offline mode", content: "Cache notes." };

    await buildContainer().get(USE_CASES.saveIdea).execute(idea);

    await background.runQueued();
    expect(sync.changes).toEqual([
      { indexed: [expect.objectContaining({ path: IDEA })], removed: [] },
    ]);
  });
});
