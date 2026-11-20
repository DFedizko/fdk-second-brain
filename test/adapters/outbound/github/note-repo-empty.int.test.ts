import { NoteNotFound } from "../../../../src/domain/errors/note-not-found";
import { NoteFolder } from "../../../../src/domain/note-folder";
import { NotePath } from "../../../../src/domain/note-path";
import type { GitHubNoteRepo } from "../../../../src/adapters/outbound/github/github-note-repo";
import type { FakeGitHubApi } from "./__fake__/fake-github-api";
import { NOTES_BRANCH, buildEmptyNotesRepo } from "./__fake__/fake-notes-repo";
import { connectRepo } from "./__fake__/github-note-repo-on-fake";

const INBOX = NotePath.of("inbox.md");
const PLAN = NotePath.of("plan.md");
const CONTENT = "# Inbox\n";
const ROOT = NoteFolder.of("");

describe("GitHubNoteRepo on an empty repository", () => {
  let api: FakeGitHubApi;
  let repository: GitHubNoteRepo;

  beforeEach(() => {
    api = buildEmptyNotesRepo();
    repository = connectRepo(api);
  });

  it("lists no notes", async () => {
    const paths = await repository.list(ROOT);

    expect(paths).toEqual([]);
  });

  it("creates the first note", async () => {
    await repository.create(INBOX, CONTENT);

    expect(api.filesOn(NOTES_BRANCH)).toEqual({ [INBOX.value]: CONTENT });
  });

  it("reads back the first note from the configured branch", async () => {
    await repository.create(INBOX, CONTENT);

    const note = await repository.read(INBOX);

    expect(note.content).toBe(CONTENT);
  });

  it("reports a note it reads as missing", async () => {
    const read = repository.read(INBOX);

    await expect(read).rejects.toThrow(NoteNotFound);
  });

  it("reports a note it moves as missing", async () => {
    const move = repository.move(INBOX, PLAN);

    await expect(move).rejects.toThrow(NoteNotFound);
  });
});
