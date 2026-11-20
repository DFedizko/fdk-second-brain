import { Container, type ServiceIdentifier } from "inversify";
import { CLOCK } from "../../../src/adapters/outbound/clock/clock.symbols";
import { GITHUB } from "../../../src/adapters/outbound/github/github.symbols";
import { DeleteNote } from "../../../src/application/use-cases/delete-note";
import { EditNote } from "../../../src/application/use-cases/edit-note";
import { ListNotes } from "../../../src/application/use-cases/list-notes";
import { MoveNote } from "../../../src/application/use-cases/move-note";
import { ReadNote } from "../../../src/application/use-cases/read-note";
import { ReadSection } from "../../../src/application/use-cases/read-section";
import { SaveIdea } from "../../../src/application/use-cases/save-idea";
import { WriteNote } from "../../../src/application/use-cases/write-note";
import { useCasesModule } from "../../../src/main/use-cases/use-cases.container";
import { USE_CASES } from "../../../src/main/use-cases/use-cases.symbols";
import { InMemoryNoteRepo } from "../../application/__fake__/in-memory-note-repo";
import { FixedClock } from "../../__stub__/fixed-clock";

type UseCaseClass = new (...args: never[]) => object;

const NOW = new Date("2026-11-19T10:30:00.000Z");

const BINDINGS: ReadonlyArray<[keyof typeof USE_CASES, UseCaseClass]> = [
  ["listNotes", ListNotes],
  ["readNote", ReadNote],
  ["readSection", ReadSection],
  ["writeNote", WriteNote],
  ["editNote", EditNote],
  ["deleteNote", DeleteNote],
  ["moveNote", MoveNote],
  ["saveIdea", SaveIdea],
];

function buildContainer(): Container {
  const container = new Container();
  container.bind(GITHUB.noteRepository).toConstantValue(new InMemoryNoteRepo());
  container.bind(CLOCK.clock).toConstantValue(new FixedClock(NOW));
  container.load(useCasesModule);
  return container;
}

describe("useCasesModule", () => {
  it.each(BINDINGS)("binds %s to its use case", (key, useCase) => {
    const container = buildContainer();
    const id: ServiceIdentifier<object> = USE_CASES[key];

    const resolved = container.get(id);

    expect(resolved).toBeInstanceOf(useCase);
  });
});
