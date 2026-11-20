import { IndexNote } from "../../../src/application/use-cases/index-note";
import { RemoveNoteIndex } from "../../../src/application/use-cases/remove-note-index";
import { MarkdownChunker } from "../../../src/domain/markdown-chunker";
import { NotePath } from "../../../src/domain/note-path";
import { InMemoryNoteRepo } from "../__fake__/in-memory-note-repo";
import { InMemorySearchIndex } from "./__fake__/in-memory-search-index";

const PATH = "projects/plan.md";
const NOTE = NotePath.of(PATH);
const CONTENT = "# Plan\nship it";
const NEW_CONTENT = "# Plan\nship it again";

describe("RemoveNoteIndex", () => {
    let index: InMemorySearchIndex;
    let notes: InMemoryNoteRepo;
    let removeNoteIndex: RemoveNoteIndex;

    beforeEach(async () => {
        index = new InMemorySearchIndex();
        notes = new InMemoryNoteRepo();
        const indexNote = new IndexNote(index, notes, new MarkdownChunker());
        removeNoteIndex = new RemoveNoteIndex(indexNote);
        await notes.create(NOTE, CONTENT);
        await indexNote.execute({ path: PATH });
    });

    it("removes the chunks of a deleted note", async () => {
        await notes.delete(NOTE);

        await removeNoteIndex.execute({ path: PATH });

        expect(index.chunksOf(PATH)).toEqual([]);
    });

    it("forgets the indexed version of a deleted note", async () => {
        await notes.delete(NOTE);

        await removeNoteIndex.execute({ path: PATH });

        await expect(index.versionOf(NOTE)).resolves.toBeNull();
    });

    it("keeps the index of a note created again before the removal arrived", async () => {
        await notes.delete(NOTE);
        await notes.create(NOTE, NEW_CONTENT);

        await removeNoteIndex.execute({ path: PATH });

        expect(index.chunksOf(PATH)).toEqual([{ heading: "Plan", seq: 0, text: "ship it again" }]);
    });

    it("accepts a note that was never indexed", async () => {
        const run = removeNoteIndex.execute({ path: "never/indexed.md" });

        await expect(run).resolves.toEqual({ path: "never/indexed.md", status: "unchanged" });
    });
});
