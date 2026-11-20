import { NoteFolder } from "../../../../src/domain/note-folder";
import { NotePath } from "../../../../src/domain/note-path";
import { NoteAlreadyExists } from "../../../../src/domain/errors/note-already-exists";
import { NoteNotFound } from "../../../../src/domain/errors/note-not-found";
import { NotesAccessDenied } from "../../../../src/domain/errors/notes-access-denied";
import { NotesRateLimited } from "../../../../src/domain/errors/notes-rate-limited";
import { NotesUnavailable } from "../../../../src/domain/errors/notes-unavailable";
import { VersionConflict } from "../../../../src/domain/errors/version-conflict";
import type { FakeGitHubApi } from "./__fake__/fake-github-api";
import { NOTES_TOKEN, buildFakeNotesRepo } from "./__fake__/fake-notes-repo";
import { FIXED_NOW, connectRepo } from "./__fake__/github-note-repo-on-fake";

const INBOX = NotePath.of("inbox.md");
const PLAN = NotePath.of("plan.md");
const TODO = NotePath.of("todo.md");
const DONE = NotePath.of("done.md");
const ARCHIVE = NotePath.of("archive.md");
const CONTENT = "# Inbox\n";
const FIRST_EDIT = "# Inbox\n\n- first\n";
const SECOND_EDIT = "# Inbox\n\n- second\n";
const WRONG_TOKEN = "ghp_wrongToken";
const ROOT = NoteFolder.of("");
const RETRY_AFTER_SECONDS = 60;
const MILLIS_PER_SECOND = 1000;
const RETRY_AT = new Date(FIXED_NOW.getTime() + RETRY_AFTER_SECONDS * MILLIS_PER_SECOND);
const SERVER_ERROR = 500;
const UNAUTHORIZED = 401;
const FORBIDDEN = 403;
const CONFLICT = 409;

async function failureOf(action: Promise<unknown>): Promise<unknown> {
  return action.then(
    () => undefined,
    (error: unknown) => error,
  );
}

describe("GitHubNoteRepo maps GitHub errors", () => {
  let api: FakeGitHubApi;

  beforeEach(() => {
    api = buildFakeNotesRepo();
  });

  it("maps 404 Not Found to NoteNotFound", async () => {
    const read = connectRepo(api).read(INBOX);

    await expect(read).rejects.toThrow(NoteNotFound);
  });

  it("maps 422 'sha wasn't supplied' to NoteAlreadyExists", async () => {
    const repository = connectRepo(api);
    await repository.create(INBOX, CONTENT);

    const create = repository.create(INBOX, CONTENT);

    await expect(create).rejects.toThrow(NoteAlreadyExists);
  });

  it("maps 409 sha mismatch from a racing write to VersionConflict", async () => {
    const repository = connectRepo(api);
    const created = await repository.create(INBOX, CONTENT);

    const writes = Promise.all([
      repository.write(INBOX, FIRST_EDIT, created.version),
      repository.write(INBOX, SECOND_EDIT, created.version),
    ]);

    await expect(writes).rejects.toThrow(VersionConflict);
  });

  it("reports the winning version when a racing write meets a 409", async () => {
    const repository = connectRepo(api);
    const created = await repository.create(INBOX, CONTENT);

    const error = await failureOf(
      Promise.all([
        repository.write(INBOX, FIRST_EDIT, created.version),
        repository.write(INBOX, SECOND_EDIT, created.version),
      ]),
    );

    const winner = await repository.read(INBOX);
    expect({ actual: (error as VersionConflict).actual, served: api.served }).toEqual({
      actual: winner.version.value,
      served: expect.arrayContaining([CONFLICT]),
    });
  });

  it("retries a move that loses the race for the branch, so both moves land", async () => {
    const repository = connectRepo(api);
    await Promise.all([INBOX, TODO].map((path) => repository.create(path, CONTENT)));

    await Promise.all([repository.move(INBOX, PLAN), repository.move(TODO, DONE)]);

    const paths = await repository.list(ROOT);
    expect(paths.map((path) => path.value)).toEqual([DONE.value, PLAN.value]);
  });

  it("retries a move once when another commit lands on the branch", async () => {
    const repository = connectRepo(api);
    await repository.create(INBOX, CONTENT);
    api.commitBeforeRefUpdates(1);

    const moved = await repository.move(INBOX, PLAN);

    expect(moved.path).toEqual(PLAN);
  });

  it("reports the winning version when a racing delete meets a 409", async () => {
    const repository = connectRepo(api);
    const created = await repository.create(INBOX, CONTENT);

    const error = await failureOf(
      Promise.all([repository.write(INBOX, FIRST_EDIT, created.version), repository.delete(INBOX)]),
    );

    const winner = await repository.read(INBOX);
    expect(error).toEqual(
      new VersionConflict(INBOX.value, created.version.value, winner.version.value),
    );
  });

  it("maps a 404 from a delete that lost the race to NoteNotFound", async () => {
    const repository = connectRepo(api);
    await repository.create(INBOX, CONTENT);

    const deletes = Promise.all([repository.delete(INBOX), repository.delete(INBOX)]);

    await expect(deletes).rejects.toThrow(NoteNotFound);
  });

  it("maps 401 Bad credentials to NotesAccessDenied", async () => {
    const list = connectRepo(api, { token: WRONG_TOKEN }).list(ROOT);

    await expect(list).rejects.toThrow(NotesAccessDenied);
  });

  it("maps 403 without permission to NotesAccessDenied", async () => {
    api.startOutage("forbidden");

    const create = connectRepo(api).create(ARCHIVE, CONTENT);

    await expect(create).rejects.toThrow(NotesAccessDenied);
  });

  it("maps 403 with no requests remaining to NotesRateLimited", async () => {
    api.exhaustRateLimit();

    const list = connectRepo(api).list(ROOT);

    await expect(list).rejects.toThrow(NotesRateLimited);
  });

  it("gives the time the primary rate limit resets", async () => {
    api.exhaustRateLimit();

    const error = await failureOf(connectRepo(api).list(ROOT));

    expect((error as NotesRateLimited).resetsAt).toBeInstanceOf(Date);
  });

  it("maps 429 secondary rate limit to NotesRateLimited with its retry-after", async () => {
    api.startOutage("secondary");

    const error = await failureOf(connectRepo(api).read(INBOX));

    expect((error as NotesRateLimited).retryAfterSeconds).toBe(RETRY_AFTER_SECONDS);
  });

  it("derives the reset time of a secondary rate limit from retry-after", async () => {
    api.startOutage("secondary");

    const error = await failureOf(connectRepo(api).read(INBOX));

    expect((error as NotesRateLimited).resetsAt).toEqual(RETRY_AT);
  });

  it("maps 403 secondary rate limit to NotesRateLimited with its retry-after", async () => {
    api.startOutage("secondaryForbidden");

    const error = await failureOf(connectRepo(api).read(INBOX));

    expect((error as NotesRateLimited).retryAfterSeconds).toBe(RETRY_AFTER_SECONDS);
  });

  it("maps a 500 to NotesUnavailable with its status", async () => {
    api.startOutage("server");

    const error = await failureOf(connectRepo(api).list(ROOT));

    expect((error as NotesUnavailable).status).toBe(SERVER_ERROR);
  });

  it("keeps GitHub's failure as the cause of NotesUnavailable", async () => {
    api.startOutage("server");

    const error = await failureOf(connectRepo(api).list(ROOT));

    expect((error as Error).cause).toMatchObject({ status: SERVER_ERROR });
  });

  it("keeps the network failure as the cause", async () => {
    api.startOutage("network");

    const error = await failureOf(connectRepo(api).list(ROOT));

    expect((error as Error).cause).toBeInstanceOf(Error);
  });

  it("keeps GitHub's failure as the cause of NotesAccessDenied", async () => {
    api.revokeToken();

    const error = await failureOf(connectRepo(api).list(ROOT));

    expect((error as Error).cause).toMatchObject({ status: UNAUTHORIZED });
  });

  it("keeps GitHub's failure as the cause of NotesRateLimited", async () => {
    api.exhaustRateLimit();

    const error = await failureOf(connectRepo(api).list(ROOT));

    expect((error as Error).cause).toMatchObject({ status: FORBIDDEN });
  });

  it("maps a network failure to NotesUnavailable", async () => {
    api.startOutage("network");

    const list = connectRepo(api).list(ROOT);

    await expect(list).rejects.toThrow(NotesUnavailable);
  });

  it.each([
    ["bad credentials", (fake: FakeGitHubApi) => fake.revokeToken()],
    ["missing permission", (fake: FakeGitHubApi) => fake.startOutage("forbidden")],
    ["a server error", (fake: FakeGitHubApi) => fake.startOutage("server")],
    ["a rate limit", (fake: FakeGitHubApi) => fake.exhaustRateLimit()],
    ["a network failure", (fake: FakeGitHubApi) => fake.startOutage("network")],
  ])("never puts the token in the error for %s", async (_name, breakApi) => {
    breakApi(api);

    const error = await failureOf(connectRepo(api).create(ARCHIVE, CONTENT));

    expect(JSON.stringify({ error, text: String(error) })).not.toContain(NOTES_TOKEN);
  });
});
