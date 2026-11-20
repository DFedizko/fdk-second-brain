import { NoteFolder } from "../../../../src/domain/note-folder";
import { NotePath } from "../../../../src/domain/note-path";
import type { FakeGitHubApi } from "./__fake__/fake-github-api";
import { DEFAULT_BRANCH, HIDDEN_NOTE, IMAGE, NOTES_BRANCH, buildFakeNotesRepo } from "./__fake__/fake-notes-repo";
import { connectRepo } from "./__fake__/github-note-repo-on-fake";
import type { GitHubNoteRepo } from "../../../../src/adapters/outbound/github/github-note-repo";

const INBOX = NotePath.of("inbox.md");
const PLAN = NotePath.of("projects/plan.md");
const ACCENTED = NotePath.of("diário/ação.md");
const CONTENT = "# Inbox\n\n- call Ana\n";
const UNICODE_CONTENT = "# Ação ✅\n\nCafé às 9h 🌱\n";
const NEW_CONTENT = "# Inbox\n\n- buy milk\n";
const ONE_COMMIT = 1;

describe("GitHubNoteRepo commits", () => {
    let api: FakeGitHubApi;
    let repository: GitHubNoteRepo;

    beforeEach(() => {
        api = buildFakeNotesRepo();
        repository = connectRepo(api);
    });

    const commitsOnNotes = () => api.store.history(NOTES_BRANCH).length;

    it("creates a note as one commit on the configured branch", async () => {
        const before = commitsOnNotes();

        await repository.create(INBOX, CONTENT);

        expect(commitsOnNotes() - before).toBe(ONE_COMMIT);
    });

    it("leaves the other branches untouched", async () => {
        const before = api.filesOn(DEFAULT_BRANCH);

        await repository.create(INBOX, CONTENT);

        expect(api.filesOn(DEFAULT_BRANCH)).toEqual(before);
    });

    it("names the commit after the change", async () => {
        await repository.create(INBOX, CONTENT);

        const [head] = api.store.history(NOTES_BRANCH);

        expect(head?.message).toBe("Create inbox.md");
    });

    it("writes a note as one commit", async () => {
        const created = await repository.create(INBOX, CONTENT);
        const before = commitsOnNotes();

        await repository.write(INBOX, NEW_CONTENT, created.version);

        expect(commitsOnNotes() - before).toBe(ONE_COMMIT);
    });

    it("deletes a note as one commit", async () => {
        await repository.create(INBOX, CONTENT);
        const before = commitsOnNotes();

        await repository.delete(INBOX);

        expect(commitsOnNotes() - before).toBe(ONE_COMMIT);
    });

    it("moves a note as one commit", async () => {
        await repository.create(INBOX, CONTENT);
        const before = commitsOnNotes();

        await repository.move(INBOX, PLAN);

        expect(commitsOnNotes() - before).toBe(ONE_COMMIT);
    });

    it("moves a note in a single tree change", async () => {
        await repository.create(INBOX, CONTENT);

        await repository.move(INBOX, PLAN);

        expect(api.filesOn(NOTES_BRANCH)).toMatchObject({ [PLAN.value]: CONTENT });
    });

    it("keeps the version when moving, as the blob is unchanged", async () => {
        const created = await repository.create(INBOX, CONTENT);

        const moved = await repository.move(INBOX, PLAN);

        expect(moved.version).toEqual(created.version);
    });

    it("round-trips non-ASCII content and paths", async () => {
        await repository.create(ACCENTED, UNICODE_CONTENT);

        const note = await repository.read(ACCENTED);

        expect(note.content).toBe(UNICODE_CONTENT);
    });

    it("stores the exact bytes on GitHub", async () => {
        await repository.create(ACCENTED, UNICODE_CONTENT);

        const files = api.filesOn(NOTES_BRANCH);

        expect(files[ACCENTED.value]).toBe(UNICODE_CONTENT);
    });

    it("lists only valid .md notes, skipping other files and dot-folders", async () => {
        await repository.create(INBOX, CONTENT);

        const paths = await repository.list(NoteFolder.of(""));

        expect(paths.map((path) => path.value)).not.toContainAnyValues([HIDDEN_NOTE, IMAGE]);
    });
});
