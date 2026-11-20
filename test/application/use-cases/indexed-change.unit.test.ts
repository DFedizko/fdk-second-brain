import { IndexedChange } from "../../../src/application/use-cases/indexed-change";
import { NoteIndexSync } from "../../../src/application/use-cases/note-index-sync";
import type { NoteView } from "../../../src/application/use-cases/note-view";
import { SavedNotePaths } from "../../../src/application/use-cases/changed-paths";
import { WriteNote, type WriteNoteInput } from "../../../src/application/use-cases/write-note";
import { NoteAlreadyExists } from "../../../src/domain/errors/note-already-exists";
import { NotePath } from "../../../src/domain/note-path";
import { InMemoryNoteRepo } from "../__fake__/in-memory-note-repo";
import { SpyIndexFailureLog } from "../../__spy__/spy-index-failure-log";
import { SpyIndexSync } from "./__spy__/spy-index-sync";
import { SpyNoteIndexer } from "./__spy__/spy-note-indexer";
import { FailingNoteIndexer } from "./__stub__/failing-note-indexer";

const PATH = "projects/plan.md";
const CONTENT = "# Plan\n";
const INPUT: WriteNoteInput = { path: PATH, content: CONTENT };
const INDEX_DOWN = new Error("D1 is down");

describe("IndexedChange", () => {
  let repository: InMemoryNoteRepo;
  let sync: SpyIndexSync;
  let writeNote: IndexedChange<WriteNoteInput, NoteView>;

  beforeEach(() => {
    repository = new InMemoryNoteRepo();
    sync = new SpyIndexSync();
    writeNote = new IndexedChange(new WriteNote(repository), new SavedNotePaths(), sync);
  });

  it("returns what the change returned", async () => {
    const view = await writeNote.execute(INPUT);

    expect(view.path).toBe(PATH);
  });

  it("syncs the index with the paths the change touched", async () => {
    await writeNote.execute(INPUT);

    expect(sync.changes).toEqual([
      { indexed: [expect.objectContaining({ path: PATH })], removed: [] },
    ]);
  });

  it("rejects with the error of a failed change", async () => {
    await repository.create(NotePath.of(PATH), CONTENT);

    const run = writeNote.execute(INPUT);

    await expect(run).rejects.toThrow(NoteAlreadyExists);
  });

  it("leaves the index alone when the change failed", async () => {
    await repository.create(NotePath.of(PATH), CONTENT);

    await writeNote.execute(INPUT).catch(() => undefined);

    expect(sync.changes).toEqual([]);
  });

  it("keeps the write when the index update fails", async () => {
    const failing = new FailingNoteIndexer(INDEX_DOWN);
    const indexSync = new NoteIndexSync(failing, new SpyNoteIndexer(), new SpyIndexFailureLog());
    const write = new IndexedChange(new WriteNote(repository), new SavedNotePaths(), indexSync);
    await write.execute(INPUT);

    const saved = await repository.read(NotePath.of(PATH));

    expect(saved.content).toBe(CONTENT);
  });
});
