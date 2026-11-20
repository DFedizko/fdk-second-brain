import { NoteIndexSync } from "../../../src/application/use-cases/note-index-sync";
import { SpyIndexFailureLog } from "../../__spy__/spy-index-failure-log";
import { SpyNoteIndexer } from "./__spy__/spy-note-indexer";
import { FailingNoteIndexer } from "./__stub__/failing-note-indexer";

const PLAN = "projects/plan.md";
const ARCHIVED = "archive/plan.md";
const INDEX_DOWN = new Error("D1 is down");

describe("NoteIndexSync", () => {
  let indexer: SpyNoteIndexer;
  let remover: SpyNoteIndexer;
  let log: SpyIndexFailureLog;
  let sync: NoteIndexSync;

  beforeEach(() => {
    indexer = new SpyNoteIndexer();
    remover = new SpyNoteIndexer();
    log = new SpyIndexFailureLog();
    sync = new NoteIndexSync(indexer, remover, log);
  });

  it("indexes the changed paths", async () => {
    await sync.apply({ indexed: [ARCHIVED], removed: [] });

    expect(indexer.paths).toEqual([ARCHIVED]);
  });

  it("removes the paths that no longer hold a note", async () => {
    await sync.apply({ indexed: [], removed: [PLAN] });

    expect(remover.paths).toEqual([PLAN]);
  });

  it("does not fail when the index can't be updated", async () => {
    const broken = new NoteIndexSync(new FailingNoteIndexer(INDEX_DOWN), remover, log);

    const run = broken.apply({ indexed: [PLAN], removed: [] });

    await expect(run).resolves.toBeUndefined();
  });

  it("logs the path whose index update failed", async () => {
    const broken = new NoteIndexSync(indexer, new FailingNoteIndexer(INDEX_DOWN), log);

    await broken.apply({ indexed: [ARCHIVED], removed: [PLAN] });

    expect(log.reported).toEqual([{ path: PLAN, error: INDEX_DOWN }]);
  });

  it("still updates the other paths when one fails", async () => {
    const broken = new NoteIndexSync(new FailingNoteIndexer(INDEX_DOWN), remover, log);

    await broken.apply({ indexed: [ARCHIVED], removed: [PLAN] });

    expect(remover.paths).toEqual([PLAN]);
  });
});
