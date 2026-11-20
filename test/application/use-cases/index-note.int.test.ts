import { SpyIndexFailureLog } from "../../__spy__/spy-index-failure-log";
import { D1SearchIndex } from "../../../src/adapters/outbound/d1-search/d1-search-index";
import { IndexNote } from "../../../src/application/use-cases/index-note";
import { SearchNotes } from "../../../src/application/use-cases/search-notes";
import { MarkdownChunker } from "../../../src/domain/markdown-chunker";
import { NotePath } from "../../../src/domain/note-path";
import { LocalRuntime } from "../../shared/adapters/local-runtime";
import { InMemoryNoteRepo } from "../__fake__/in-memory-note-repo";

const PATH = "work/plan.md";
const NOTE = NotePath.of(PATH);
const FIRST_CONTENT = "# Plan\nship the search";
const SECOND_CONTENT = "# Plan\nship the sync";

describe("IndexNote on D1", () => {
    let runtime: LocalRuntime | undefined;
    let notes: InMemoryNoteRepo;
    let indexNote: IndexNote;
    let searchNotes: SearchNotes;

    beforeEach(async () => {
        runtime = await LocalRuntime.start();
        await runtime.migrate();
        const index = new D1SearchIndex(await runtime.database(), new SpyIndexFailureLog());
        notes = new InMemoryNoteRepo();
        indexNote = new IndexNote(index, notes, new MarkdownChunker());
        searchNotes = new SearchNotes(index);
    });

    afterEach(async () => {
        await runtime?.stop();
        runtime = undefined;
    });

    it("makes an indexed note searchable", async () => {
        await notes.create(NOTE, FIRST_CONTENT);

        await indexNote.execute({ path: PATH });

        const results = await searchNotes.execute({ query: "search" });
        expect(results).toEqual([{ path: PATH, heading: "Plan", snippet: "ship the search" }]);
    });

    it("indexes the note's latest content when it changed", async () => {
        const created = await notes.create(NOTE, FIRST_CONTENT);
        await indexNote.execute({ path: PATH });
        await notes.write(NOTE, SECOND_CONTENT, created.version);

        await indexNote.execute({ path: PATH });

        expect(await searchNotes.execute({ query: "search" })).toEqual([]);
    });

    it("removes a deleted note from the results", async () => {
        await notes.create(NOTE, FIRST_CONTENT);
        await indexNote.execute({ path: PATH });
        await notes.delete(NOTE);

        await indexNote.execute({ path: PATH });

        expect(await searchNotes.execute({ query: "search" })).toEqual([]);
    });
});
