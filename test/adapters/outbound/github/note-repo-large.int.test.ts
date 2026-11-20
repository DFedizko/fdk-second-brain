import { UnreadableNote } from "../../../../src/domain/errors/unreadable-note";
import { NotePath } from "../../../../src/domain/note-path";
import type { GitHubNoteRepo } from "../../../../src/adapters/outbound/github/github-note-repo";
import type { FakeGitHubApi } from "./__fake__/fake-github-api";
import { NOTES_BRANCH, buildFakeNotesRepo } from "./__fake__/fake-notes-repo";
import { connectRepo } from "./__fake__/github-note-repo-on-fake";

const INBOX = NotePath.of("inbox.md");
const PLAN = NotePath.of("plan.md");
const OVER_ONE_MEGABYTE = 1024 * 1024 + 1;
const LARGE = "a".repeat(OVER_ONE_MEGABYTE);
const EDITED = "# Smaller now\n";
const WITH_BOM = "﻿# Inbox\n";
const FILE_MODE = "100644";
const INVALID_UTF8 = new Uint8Array([0x23, 0x20, 0xff, 0xfe, 0x0a]);

describe("GitHubNoteRepo with notes over 1 MB", () => {
  let api: FakeGitHubApi;
  let repository: GitHubNoteRepo;

  beforeEach(async () => {
    api = buildFakeNotesRepo();
    repository = connectRepo(api);
    await repository.create(INBOX, LARGE);
  });

  it("reads the whole note through its blob", async () => {
    const note = await repository.read(INBOX);

    expect(note.content).toBe(LARGE);
  });

  it("writes over the note", async () => {
    const current = await repository.read(INBOX);

    await repository.write(INBOX, EDITED, current.version);

    expect(api.filesOn(NOTES_BRANCH)).toMatchObject({ [INBOX.value]: EDITED });
  });

  it("deletes the note", async () => {
    await repository.delete(INBOX);

    expect(api.filesOn(NOTES_BRANCH)).not.toHaveProperty(INBOX.value);
  });

  it("moves the note", async () => {
    await repository.move(INBOX, PLAN);

    expect(api.filesOn(NOTES_BRANCH)[PLAN.value]).toBe(LARGE);
  });
});

describe("GitHubNoteRepo decoding note text", () => {
  let api: FakeGitHubApi;
  let repository: GitHubNoteRepo;

  beforeEach(() => {
    api = buildFakeNotesRepo();
    repository = connectRepo(api);
  });

  it("keeps a byte order mark at the start of a note", async () => {
    await repository.create(INBOX, WITH_BOM);

    const note = await repository.read(INBOX);

    expect(note.content).toBe(WITH_BOM);
  });

  it("deletes a note that is not valid UTF-8", async () => {
    api.addEntry(NOTES_BRANCH, INBOX.value, FILE_MODE, INVALID_UTF8);

    await repository.delete(INBOX);

    expect(api.filesOn(NOTES_BRANCH)).not.toHaveProperty(INBOX.value);
  });

  it("moves a note that is not valid UTF-8 with its bytes unchanged", async () => {
    api.addEntry(NOTES_BRANCH, INBOX.value, FILE_MODE, INVALID_UTF8);

    await repository.move(INBOX, PLAN);

    const moved = api.store.filesAt(NOTES_BRANCH)?.get(PLAN.value) ?? "";
    expect(api.store.bytesOf(moved)).toEqual(INVALID_UTF8);
  });

  it("refuses a note that is not valid UTF-8 instead of corrupting it", async () => {
    api.addEntry(NOTES_BRANCH, INBOX.value, FILE_MODE, INVALID_UTF8);

    const read = repository.read(INBOX);

    await expect(read).rejects.toThrow(UnreadableNote);
  });
});
