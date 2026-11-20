import { ReadSection } from "../../../src/application/use-cases/read-section";
import { NotePath } from "../../../src/domain/note-path";
import { NoteNotFound } from "../../../src/domain/errors/note-not-found";
import { SectionNotFound } from "../../../src/domain/errors/section-not-found";
import { InMemoryNoteRepo } from "../__fake__/in-memory-note-repo";

const PATH = "projects/plan.md";
const CONTENT = "# Plan\nintro\n## Tasks\n- ship it\n## Risks\n- none\n";
const HEADING = "Tasks";

describe("ReadSection", () => {
    let repository: InMemoryNoteRepo;
    let readSection: ReadSection;

    beforeEach(() => {
        repository = new InMemoryNoteRepo();
        readSection = new ReadSection(repository);
    });

    it("returns only the content under the heading, with the note version", async () => {
        const created = await repository.create(NotePath.of(PATH), CONTENT);

        const section = await readSection.execute({ path: PATH, heading: HEADING });

        expect(section).toEqual({
            path: PATH,
            heading: HEADING,
            content: "## Tasks\n- ship it",
            version: created.version.value,
        });
    });

    it("returns the heading as the note writes it", async () => {
        await repository.create(NotePath.of(PATH), CONTENT);

        const section = await readSection.execute({ path: PATH, heading: "  tasks " });

        expect(section.heading).toBe(HEADING);
    });

    it("rejects a heading the note does not have", async () => {
        await repository.create(NotePath.of(PATH), CONTENT);

        const read = readSection.execute({ path: PATH, heading: "Budget" });

        await expect(read).rejects.toThrow(SectionNotFound);
    });

    it("rejects a missing note", async () => {
        const read = readSection.execute({ path: PATH, heading: HEADING });

        await expect(read).rejects.toThrow(NoteNotFound);
    });
});
