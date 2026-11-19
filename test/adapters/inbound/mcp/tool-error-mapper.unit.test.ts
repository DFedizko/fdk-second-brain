import { ToolErrorMapper } from "../../../../src/adapters/inbound/mcp/tool-error-mapper";
import { InvalidPath } from "../../../../src/domain/errors/invalid-path";
import { NoteAlreadyExists } from "../../../../src/domain/errors/note-already-exists";
import { NoteNotFound } from "../../../../src/domain/errors/note-not-found";
import { EmptySearchQuery } from "../../../../src/domain/errors/empty-search-query";
import { NotesAccessDenied } from "../../../../src/domain/errors/notes-access-denied";
import { NotesRateLimited } from "../../../../src/domain/errors/notes-rate-limited";
import { NotesUnavailable } from "../../../../src/domain/errors/notes-unavailable";
import { PassageNotFound } from "../../../../src/domain/errors/passage-not-found";
import { SectionNotFound } from "../../../../src/domain/errors/section-not-found";
import { PassageNotUnique } from "../../../../src/domain/errors/passage-not-unique";
import { VersionConflict } from "../../../../src/domain/errors/version-conflict";

const PATH = "projects/plan.md";
const SERVICE_UNAVAILABLE = 503;
const STORE_DOWN_MESSAGE = "The notes can't be reached right now. Try again in a few minutes.";
const OCCURRENCES = 3;
const UNEXPECTED_MESSAGE = "Something went wrong on the server. Try again later.";
const SECRET_DETAIL = "token ghp_secret leaked in a stack";

describe("ToolErrorMapper", () => {
  it("marks the result as an error", () => {
    const mapper = new ToolErrorMapper();

    const result = mapper.toResult(new NoteNotFound(PATH));

    expect(result.isError).toBe(true);
  });

  it("tells how to find existing notes when a note is missing", () => {
    const mapper = new ToolErrorMapper();

    const result = mapper.toResult(new NoteNotFound(PATH));

    expect(result.content).toEqual([
      { type: "text", text: `Note not found: "${PATH}". Call list_notes to see the paths.` },
    ]);
  });

  it("tells to read the note again on a version conflict", () => {
    const mapper = new ToolErrorMapper();

    const result = mapper.toResult(new VersionConflict(PATH, "aaa", "bbb"));

    expect(result.content).toEqual([
      {
        type: "text",
        text: `Note "${PATH}" changed: expected version aaa, found bbb. Read the note again and retry with its current version.`,
      },
    ]);
  });

  it("tells how to replace a note that already exists", () => {
    const mapper = new ToolErrorMapper();

    const result = mapper.toResult(new NoteAlreadyExists(PATH));

    expect(result.content).toEqual([
      {
        type: "text",
        text: `Note already exists: "${PATH}". Pass its expectedVersion to replace it, or pick another path.`,
      },
    ]);
  });

  it.each([
    new InvalidPath("../x.md", "it leaves the notes folder"),
    new PassageNotUnique("todo", OCCURRENCES),
    new PassageNotFound("todo"),
    new SectionNotFound("Goals"),
    new EmptySearchQuery("  "),
  ])("passes the message of $name through", (error) => {
    const mapper = new ToolErrorMapper();

    const result = mapper.toResult(error);

    expect(result.content).toEqual([{ type: "text", text: error.message }]);
  });

  it.each([
    new NotesAccessDenied(),
    new NotesRateLimited(),
    new NotesUnavailable(SERVICE_UNAVAILABLE),
  ])("gives the client a generic message for $name", (error) => {
    const mapper = new ToolErrorMapper();

    const result = mapper.toResult(error);

    expect(result.content).toEqual([{ type: "text", text: STORE_DOWN_MESSAGE }]);
  });

  it("hides the details of an unexpected error", () => {
    const mapper = new ToolErrorMapper();

    const result = mapper.toResult(new Error(SECRET_DETAIL));

    expect(result.content).toEqual([{ type: "text", text: UNEXPECTED_MESSAGE }]);
  });
});
