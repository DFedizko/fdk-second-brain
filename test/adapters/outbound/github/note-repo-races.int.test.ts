import { ConcurrentChange } from "../../../../src/domain/errors/concurrent-change";
import { NotePath } from "../../../../src/domain/note-path";
import type { GitHubNoteRepo } from "../../../../src/adapters/outbound/github/github-note-repo";
import type { FakeGitHubApi } from "./__fake__/fake-github-api";
import { NOTES_BRANCH, buildFakeNotesRepo } from "./__fake__/fake-notes-repo";
import { connectRepo } from "./__fake__/github-note-repo-on-fake";

const INBOX = NotePath.of("inbox.md");
const CONTENT = "# Inbox\n";
const EDITED = "# Inbox\n\n- edited\n";
const ONCE = 1;
const ALWAYS = Number.POSITIVE_INFINITY;

describe("GitHubNoteRepo when another commit lands during a file write", () => {
  let api: FakeGitHubApi;
  let repository: GitHubNoteRepo;

  beforeEach(() => {
    api = buildFakeNotesRepo();
    repository = connectRepo(api);
  });

  it("retries a create", async () => {
    api.commitDuringFileWrites(ONCE);

    await repository.create(INBOX, CONTENT);

    expect(api.filesOn(NOTES_BRANCH)).toMatchObject({ [INBOX.value]: CONTENT });
  });

  it("retries a write whose version is still current", async () => {
    const created = await repository.create(INBOX, CONTENT);
    api.commitDuringFileWrites(ONCE);

    await repository.write(INBOX, EDITED, created.version);

    expect(api.filesOn(NOTES_BRANCH)).toMatchObject({ [INBOX.value]: EDITED });
  });

  it("retries a delete whose version is still current", async () => {
    await repository.create(INBOX, CONTENT);
    api.commitDuringFileWrites(ONCE);

    await repository.delete(INBOX);

    expect(api.filesOn(NOTES_BRANCH)).not.toHaveProperty(INBOX.value);
  });

  it("gives up on a write with ConcurrentChange when the branch keeps moving", async () => {
    const created = await repository.create(INBOX, CONTENT);
    api.commitDuringFileWrites(ALWAYS);

    const write = repository.write(INBOX, EDITED, created.version);

    await expect(write).rejects.toThrow(ConcurrentChange);
  });

  it("gives up on a delete with ConcurrentChange when the branch keeps moving", async () => {
    await repository.create(INBOX, CONTENT);
    api.commitDuringFileWrites(ALWAYS);

    const remove = repository.delete(INBOX);

    await expect(remove).rejects.toThrow(ConcurrentChange);
  });
});
