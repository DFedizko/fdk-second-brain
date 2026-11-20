import { ListNotes } from "../../../src/application/use-cases/list-notes";
import { NotePath } from "../../../src/domain/note-path";
import { InvalidPath } from "../../../src/domain/errors/invalid-path";
import { InMemoryNoteRepo } from "../__fake__/in-memory-note-repo";

const PATHS = ["inbox.md", "projects/plan.md", "projects/old/notes.md"];
const CONTENT = "# Note\n";

describe("ListNotes", () => {
    let repository: InMemoryNoteRepo;
    let listNotes: ListNotes;

    beforeEach(async () => {
        repository = new InMemoryNoteRepo();
        listNotes = new ListNotes(repository);
        await Promise.all(PATHS.map((raw) => repository.create(NotePath.of(raw), CONTENT)));
    });

    it("lists every note when no folder is given", async () => {
        const paths = await listNotes.execute({});

        expect(paths).toEqual(["inbox.md", "projects/old/notes.md", "projects/plan.md"]);
    });

    it("lists only the notes inside the given folder", async () => {
        const paths = await listNotes.execute({ folder: "projects/old" });

        expect(paths).toEqual(["projects/old/notes.md"]);
    });

    it("rejects a folder that escapes the notes", async () => {
        const list = listNotes.execute({ folder: "../secrets" });

        await expect(list).rejects.toThrow(InvalidPath);
    });
});
