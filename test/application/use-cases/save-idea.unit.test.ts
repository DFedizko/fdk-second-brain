import { SaveIdea } from "../../../src/application/use-cases/save-idea";
import { NotePath } from "../../../src/domain/note-path";
import { InMemoryNoteRepo } from "../__fake__/in-memory-note-repo";
import { FixedClock } from "../../__stub__/fixed-clock";

const NOW = new Date("2026-11-19T15:30:00Z");
const EARLY_UTC = new Date("2026-11-19T00:00:01Z");
const LATE_UTC = new Date("2026-11-19T23:59:59Z");
const TITLE = "Grow tomatoes indoors";
const BODY = "Use a grow light in the kitchen.";
const IDEA_PATH = "ideas/2026-11-19-grow-tomatoes-indoors.md";
const SECOND_PATH = "ideas/2026-11-19-grow-tomatoes-indoors-2.md";
const THIRD_PATH = "ideas/2026-11-19-grow-tomatoes-indoors-3.md";

describe("SaveIdea", () => {
  let repository: InMemoryNoteRepo;
  let saveIdea: SaveIdea;

  beforeEach(() => {
    repository = new InMemoryNoteRepo();
    saveIdea = new SaveIdea(repository, new FixedClock(NOW));
  });

  it("writes the idea under ideas with the date and a slug of the title", async () => {
    const idea = await saveIdea.execute({ title: TITLE, content: BODY });

    expect(idea.path).toBe(IDEA_PATH);
  });

  it("starts the note with the title as a heading", async () => {
    await saveIdea.execute({ title: TITLE, content: BODY });

    const note = await repository.read(NotePath.of(IDEA_PATH));

    expect(note.content).toBe(`# ${TITLE}\n\n${BODY}`);
  });

  it("adds -2 when the idea file already exists", async () => {
    await repository.create(NotePath.of(IDEA_PATH), BODY);

    const idea = await saveIdea.execute({ title: TITLE, content: BODY });

    expect(idea.path).toBe(SECOND_PATH);
  });

  it("adds -3 when -2 is taken too", async () => {
    await Promise.all(
      [IDEA_PATH, SECOND_PATH].map((raw) => repository.create(NotePath.of(raw), BODY)),
    );

    const idea = await saveIdea.execute({ title: TITLE, content: BODY });

    expect(idea.path).toBe(THIRD_PATH);
  });

  it.each([EARLY_UTC, LATE_UTC])("dates the idea by the clock in UTC at %s", async (instant) => {
    const dated = new SaveIdea(repository, new FixedClock(instant));

    const idea = await dated.execute({ title: TITLE, content: BODY });

    expect(idea.path).toBe(IDEA_PATH);
  });

  it("returns the saved note with its version", async () => {
    const idea = await saveIdea.execute({ title: TITLE, content: BODY });

    const note = await repository.read(NotePath.of(IDEA_PATH));

    expect(idea.version).toBe(note.version.value);
  });
});
