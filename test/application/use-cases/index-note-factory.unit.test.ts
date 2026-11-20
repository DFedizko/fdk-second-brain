import { IndexNote } from "../../../src/application/use-cases/index-note";
import { IndexNoteFactory } from "../../../src/application/use-cases/index-note-factory";
import { MarkdownChunker } from "../../../src/domain/markdown-chunker";
import { NotePath } from "../../../src/domain/note-path";
import { InMemoryNoteRepo } from "../__fake__/in-memory-note-repo";
import { InMemorySearchIndex } from "./__fake__/in-memory-search-index";

const PLAN = "projects/plan.md";

describe("IndexNoteFactory", () => {
    it("builds an indexer that reads from the given notes", async () => {
        const index = new InMemorySearchIndex();
        const notes = new InMemoryNoteRepo();
        await notes.create(NotePath.of(PLAN), "# Plan\n\nship it\n");

        const result = await new IndexNoteFactory(index, new MarkdownChunker()).over(notes).execute({ path: PLAN });

        expect(result).toEqual({ path: PLAN, status: "indexed" });
    });

    it("builds an IndexNote", () => {
        const factory = new IndexNoteFactory(new InMemorySearchIndex(), new MarkdownChunker());

        const indexer = factory.over(new InMemoryNoteRepo());

        expect(indexer).toBeInstanceOf(IndexNote);
    });
});
