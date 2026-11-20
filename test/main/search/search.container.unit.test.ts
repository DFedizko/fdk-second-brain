import { Container, type ServiceIdentifier } from "inversify";
import { D1_SEARCH_SYMBOLS } from "../../../src/adapters/outbound/d1-search/d1-search.symbols";
import { GITHUB } from "../../../src/adapters/outbound/github/github.symbols";
import { LOGGING } from "../../../src/adapters/outbound/logging/logging.symbols";
import { IndexNote } from "../../../src/application/use-cases/index-note";
import { NoteIndexSync } from "../../../src/application/use-cases/note-index-sync";
import { RemoveNoteIndex } from "../../../src/application/use-cases/remove-note-index";
import { SearchNotes } from "../../../src/application/use-cases/search-notes";
import { NotePath } from "../../../src/domain/note-path";
import { searchModule } from "../../../src/main/search/search.container";
import { SEARCH } from "../../../src/main/search/search.symbols";
import { InMemoryNoteRepo } from "../../application/__fake__/in-memory-note-repo";
import { InMemorySearchIndex } from "../../application/use-cases/__fake__/in-memory-search-index";
import { SpyIndexFailureLog } from "../../__spy__/spy-index-failure-log";

type UseCaseClass = new (...args: never[]) => object;

const PATH = "projects/plan.md";
const BINDINGS: ReadonlyArray<[keyof typeof SEARCH, UseCaseClass]> = [
  ["indexNote", IndexNote],
  ["removeNoteIndex", RemoveNoteIndex],
  ["searchNotes", SearchNotes],
  ["indexSync", NoteIndexSync],
];

let notes: InMemoryNoteRepo;
let index: InMemorySearchIndex;

function buildContainer(): Container {
  const container = new Container();
  container.bind(GITHUB.noteRepository).toConstantValue(notes);
  container.bind(D1_SEARCH_SYMBOLS.SearchIndex).toConstantValue(index);
  container.bind(LOGGING.indexFailureLog).toConstantValue(new SpyIndexFailureLog());
  container.load(searchModule);
  return container;
}

beforeEach(() => {
  notes = new InMemoryNoteRepo();
  index = new InMemorySearchIndex();
});

describe("searchModule", () => {
  it.each(BINDINGS)("binds %s to its use case", (key, useCase) => {
    const id: ServiceIdentifier<object> = SEARCH[key];

    const resolved = buildContainer().get(id);

    expect(resolved).toBeInstanceOf(useCase);
  });

  it("syncs the index from the note repository", async () => {
    await notes.create(NotePath.of(PATH), "# Plan\nship it");

    await buildContainer()
      .get(SEARCH.indexSync)
      .apply({ indexed: [PATH], removed: [] });

    expect(index.chunksOf(PATH)).toEqual([{ heading: "Plan", seq: 0, text: "ship it" }]);
  });
});
