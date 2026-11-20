import { D1IndexManifest } from "../../../src/adapters/outbound/d1-search/d1-index-manifest";
import { D1SearchIndex } from "../../../src/adapters/outbound/d1-search/d1-search-index";
import { DeletedNotePaths, SavedNotePaths } from "../../../src/application/use-cases/changed-paths";
import { DeleteNote } from "../../../src/application/use-cases/delete-note";
import { IndexNote } from "../../../src/application/use-cases/index-note";
import { IndexedChange } from "../../../src/application/use-cases/indexed-change";
import { NoteIndexSync } from "../../../src/application/use-cases/note-index-sync";
import { RemoveNoteIndex } from "../../../src/application/use-cases/remove-note-index";
import { SearchNotes } from "../../../src/application/use-cases/search-notes";
import { WriteNote } from "../../../src/application/use-cases/write-note";
import { MarkdownChunker } from "../../../src/domain/markdown-chunker";
import { SpyIndexFailureLog } from "../../__spy__/spy-index-failure-log";
import type { LocalRuntime } from "../../shared/adapters/local-runtime";
import { InMemoryNoteRepo } from "../__fake__/in-memory-note-repo";
import { ManualBackgroundTasks } from "./__fake__/manual-background-tasks";

export class StaleIndexRace {
    private constructor(
        readonly notes: InMemoryNoteRepo,
        readonly log: SpyIndexFailureLog,
        readonly index: D1SearchIndex,
        readonly manifest: D1IndexManifest,
        readonly indexer: IndexNote,
    ) {}

    static async on(runtime: LocalRuntime): Promise<StaleIndexRace> {
        const database = await runtime.database();
        const log = new SpyIndexFailureLog();
        const index = new D1SearchIndex(database, log);
        const repo = new InMemoryNoteRepo();
        return new StaleIndexRace(
            repo,
            log,
            index,
            new D1IndexManifest(database, log),
            new IndexNote(index, repo, new MarkdownChunker()),
        );
    }

    async writeThenDelete(path: string, content: string): Promise<void> {
        const sync = new NoteIndexSync(this.indexer, new RemoveNoteIndex(this.indexer), this.log);
        const afterWrite = new ManualBackgroundTasks();
        const afterDelete = new ManualBackgroundTasks();
        const write = new IndexedChange(new WriteNote(this.notes), new SavedNotePaths(), sync, afterWrite);
        const remove = new IndexedChange(new DeleteNote(this.notes), new DeletedNotePaths(), sync, afterDelete);
        await write.execute({ path, content });
        await remove.execute({ path });
        await afterDelete.runQueued();
        await afterWrite.runQueued();
    }

    async searchPaths(query: string): Promise<string[]> {
        const results = await new SearchNotes(this.index).execute({ query });
        return results.map((result) => result.path);
    }
}
