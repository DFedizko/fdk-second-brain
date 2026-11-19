import { InMemoryNoteRepo } from "../__fake__/in-memory-note-repo";
import { describeNoteRepository } from "./note-repo.contract";

describeNoteRepository("InMemoryNoteRepo", () => new InMemoryNoteRepo());
