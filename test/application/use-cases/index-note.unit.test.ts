import { IndexNote, MAX_INDEX_ATTEMPTS, MAX_INDEX_PASSES } from "../../../src/application/use-cases/index-note";
import { IndexWriteConflict } from "../../../src/domain/errors/index-write-conflict";
import { InvalidPath } from "../../../src/domain/errors/invalid-path";
import { UnreadableNote } from "../../../src/domain/errors/unreadable-note";
import { MarkdownChunker } from "../../../src/domain/markdown-chunker";
import { NotePath } from "../../../src/domain/note-path";
import { NoteVersion } from "../../../src/domain/note-version";
import { InMemoryNoteRepo } from "../__fake__/in-memory-note-repo";
import { InMemorySearchIndex } from "./__fake__/in-memory-search-index";
import { UnreadableNoteLookup } from "./__stub__/unreadable-note-lookup";

const PATH = "projects/plan.md";
const NOTE = NotePath.of(PATH);
const FIRST_CONTENT = "# Plan\nship the search";
const SECOND_CONTENT = "# Plan\nship the sync";
const STALE_VERSION = NoteVersion.of("aaa111");
const STALE_CHUNKS = [{ heading: "Plan", seq: 0, text: "stale words" }];
const RACER_PREFIX = "bbb00";
const QUICK_SAVES = 5;
const LATEST_TEXT = `ship save ${QUICK_SAVES}`;

describe("IndexNote", () => {
    let index: InMemorySearchIndex;
    let notes: InMemoryNoteRepo;
    let indexNote: IndexNote;

    beforeEach(() => {
        index = new InMemorySearchIndex();
        notes = new InMemoryNoteRepo();
        indexNote = new IndexNote(index, notes, new MarkdownChunker());
    });

    const writeStale = async () => {
        await index.replace(NOTE, STALE_VERSION, STALE_CHUNKS, null);
    };

    const overwrite = (attempt: number) => async () => {
        const current = await index.versionOf(NOTE);
        await index.replace(NOTE, NoteVersion.of(`${RACER_PREFIX}${attempt}`), STALE_CHUNKS, current);
    };

    it("reports a note that can never be read", async () => {
        const unreadable = new IndexNote(index, new UnreadableNoteLookup(), new MarkdownChunker());

        const run = unreadable.execute({ path: PATH });

        await expect(run).rejects.toThrow(UnreadableNote);
    });

    it("removes a note that can never be read from the index", async () => {
        await writeStale();
        const unreadable = new IndexNote(index, new UnreadableNoteLookup(), new MarkdownChunker());

        await unreadable.execute({ path: PATH }).catch(() => undefined);

        expect(await index.versionOf(NOTE)).toBeNull();
    });

    it("keeps an index entry written while the unreadable note was read", async () => {
        await writeStale();
        const lookup = new UnreadableNoteLookup(overwrite(1));
        const unreadable = new IndexNote(index, lookup, new MarkdownChunker());

        await unreadable.execute({ path: PATH }).catch(() => undefined);

        expect(await index.versionOf(NOTE)).toEqual(NoteVersion.of(`${RACER_PREFIX}1`));
    });

    it("stores the chunks of the note as it is now in the repository", async () => {
        await notes.create(NOTE, FIRST_CONTENT);

        await indexNote.execute({ path: PATH });

        expect(index.chunksOf(PATH)).toEqual([{ heading: "Plan", seq: 0, text: "ship the search" }]);
    });

    it("reports a note it indexed", async () => {
        await notes.create(NOTE, FIRST_CONTENT);

        const result = await indexNote.execute({ path: PATH });

        expect(result).toEqual({ path: PATH, status: "indexed" });
    });

    it("skips a note whose current version is already indexed", async () => {
        await notes.create(NOTE, FIRST_CONTENT);
        await indexNote.execute({ path: PATH });

        const result = await indexNote.execute({ path: PATH });

        expect(result).toEqual({ path: PATH, status: "unchanged" });
    });

    it("replaces the chunks of a note that changed", async () => {
        const created = await notes.create(NOTE, FIRST_CONTENT);
        await indexNote.execute({ path: PATH });
        await notes.write(NOTE, SECOND_CONTENT, created.version);

        await indexNote.execute({ path: PATH });

        expect(index.chunksOf(PATH)).toEqual([{ heading: "Plan", seq: 0, text: "ship the sync" }]);
    });

    it("does not bring back a note that was deleted", async () => {
        await notes.create(NOTE, FIRST_CONTENT);
        await notes.delete(NOTE);

        await indexNote.execute({ path: PATH });

        expect(index.chunksOf(PATH)).toEqual([]);
    });

    it("removes the index of a note that no longer exists", async () => {
        await notes.create(NOTE, FIRST_CONTENT);
        await indexNote.execute({ path: PATH });
        await notes.delete(NOTE);

        const result = await indexNote.execute({ path: PATH });

        expect({ result, chunks: index.chunksOf(PATH) }).toEqual({
            result: { path: PATH, status: "removed" },
            chunks: [],
        });
    });

    it("writes again when a slower indexer stored an older version first", async () => {
        await notes.create(NOTE, SECOND_CONTENT);
        index.beforeNextWrites(writeStale);

        await indexNote.execute({ path: PATH });

        expect(index.chunksOf(PATH)).toEqual([{ heading: "Plan", seq: 0, text: "ship the sync" }]);
    });

    it("ends at the reverted content when an edit is undone while it writes", async () => {
        const created = await notes.create(NOTE, FIRST_CONTENT);
        await indexNote.execute({ path: PATH });
        const edited = await notes.write(NOTE, SECOND_CONTENT, created.version);
        index.beforeNextWrites(async () => {
            await notes.write(NOTE, FIRST_CONTENT, edited.version);
        });

        await indexNote.execute({ path: PATH });

        expect(index.chunksOf(PATH)).toEqual([{ heading: "Plan", seq: 0, text: "ship the search" }]);
    });

    it("ends at the latest version after five quick saves while it writes", async () => {
        let current = await notes.create(NOTE, FIRST_CONTENT);
        const save = (n: number) => async () => {
            current = await notes.write(NOTE, `# Plan\nship save ${n}`, current.version);
        };
        index.beforeNextWrites(...Array.from({ length: QUICK_SAVES }, (_, n) => save(n + 1)));

        const result = await indexNote.execute({ path: PATH });

        expect({ result, chunks: index.chunksOf(PATH) }).toEqual({
            result: { path: PATH, status: "indexed" },
            chunks: [{ heading: "Plan", seq: 0, text: LATEST_TEXT }],
        });
    });

    it("gives up with IndexWriteConflict when saves never stop", async () => {
        let current = await notes.create(NOTE, FIRST_CONTENT);
        const save = (n: number) => async () => {
            current = await notes.write(NOTE, `# Plan\nship save ${n}`, current.version);
        };
        index.beforeNextWrites(...Array.from({ length: MAX_INDEX_PASSES }, (_, n) => save(n + 1)));

        const run = indexNote.execute({ path: PATH });

        await expect(run).rejects.toThrow(IndexWriteConflict);
    });

    it("gives up with IndexWriteConflict when every write loses a race", async () => {
        await notes.create(NOTE, SECOND_CONTENT);
        index.beforeNextWrites(...Array.from({ length: MAX_INDEX_ATTEMPTS }, (_, n) => overwrite(n)));

        const run = indexNote.execute({ path: PATH });

        await expect(run).rejects.toThrow(IndexWriteConflict);
    });

    it("rejects a path that is not a note", async () => {
        const run = indexNote.execute({ path: "plan.txt" });

        await expect(run).rejects.toThrow(InvalidPath);
    });
});
