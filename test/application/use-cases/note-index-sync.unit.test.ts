import type { NoteView } from "../../../src/application/use-cases/note-view";
import { NoteIndexSync } from "../../../src/application/use-cases/note-index-sync";
import { SpyIndexFailureLog } from "../../__spy__/spy-index-failure-log";
import { SpyNoteIndexer } from "./__spy__/spy-note-indexer";
import { FailingNoteIndexer } from "./__stub__/failing-note-indexer";

const PLAN = "projects/plan.md";
const ARCHIVED = "archive/plan.md";
const INDEX_DOWN = new Error("D1 is down");
const SAVED: NoteView = { path: ARCHIVED, content: "# Plan\n", version: "abc123" };

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

  it("indexes each saved note from what was saved", async () => {
    await sync.apply({ indexed: [SAVED], removed: [] });

    expect(indexer.inputs).toEqual([{ path: ARCHIVED, saved: SAVED }]);
  });

  it("removes the paths that no longer hold a note", async () => {
    await sync.apply({ indexed: [], removed: [PLAN] });

    expect(remover.paths).toEqual([PLAN]);
  });

  it("does not fail when the index can't be updated", async () => {
    const broken = new NoteIndexSync(new FailingNoteIndexer(INDEX_DOWN), remover, log);

    const run = broken.apply({ indexed: [{ ...SAVED, path: PLAN }], removed: [] });

    await expect(run).resolves.toBeUndefined();
  });

  it("logs the path whose index update failed", async () => {
    const broken = new NoteIndexSync(indexer, new FailingNoteIndexer(INDEX_DOWN), log);

    await broken.apply({ indexed: [SAVED], removed: [PLAN] });

    expect(log.reported).toEqual([{ path: PLAN, error: INDEX_DOWN }]);
  });

  it("still updates the other paths when one fails", async () => {
    const broken = new NoteIndexSync(new FailingNoteIndexer(INDEX_DOWN), remover, log);

    await broken.apply({ indexed: [SAVED], removed: [PLAN] });

    expect(remover.paths).toEqual([PLAN]);
  });
});
