import { ConcurrentChange } from "../../../../src/domain/errors/concurrent-change";
import { NoteAlreadyExists } from "../../../../src/domain/errors/note-already-exists";
import { NotesUnavailable } from "../../../../src/domain/errors/notes-unavailable";
import { NotePath } from "../../../../src/domain/note-path";
import type { GitHubNoteRepo } from "../../../../src/adapters/outbound/github/github-note-repo";
import type { FakeGitHubApi } from "./__fake__/fake-github-api";
import { NOTES_BRANCH, buildFakeNotesRepo } from "./__fake__/fake-notes-repo";
import { connectRepo } from "./__fake__/github-note-repo-on-fake";

const INBOX = NotePath.of("inbox.md");
const TAKEN = NotePath.of("taken.md");
const NESTED = NotePath.of("taken.md/kept.md");
const NESTED_SOURCE = NotePath.of("projects/scripts/run.md");
const CONTENT = "# Inbox\n";
const KEPT_CONTENT = "# Kept\n";
const SYMLINK_MODE = "120000";
const SUBMODULE_MODE = "160000";
const EXECUTABLE_MODE = "100755";
const OUTSIDE_TARGET = "../elsewhere.md";
const SUBMODULE_COMMIT = "1111111111111111111111111111111111111111";
const ALWAYS = Number.POSITIVE_INFINITY;
const UNPROCESSABLE = 422;

async function failureOf(action: Promise<unknown>): Promise<unknown> {
    return action.then(
        () => undefined,
        (error: unknown) => error,
    );
}

describe("GitHubNoteRepo moves", () => {
    let api: FakeGitHubApi;
    let repository: GitHubNoteRepo;

    beforeEach(async () => {
        api = buildFakeNotesRepo();
        repository = connectRepo(api);
        await repository.create(INBOX, CONTENT);
    });

    it("refuses to move a note onto a folder", async () => {
        await repository.create(NESTED, KEPT_CONTENT);

        const move = repository.move(INBOX, TAKEN);

        await expect(move).rejects.toThrow(NoteAlreadyExists);
    });

    it("keeps the folder's notes when a move onto it is refused", async () => {
        await repository.create(NESTED, KEPT_CONTENT);

        await repository.move(INBOX, TAKEN).catch(() => undefined);

        expect(api.filesOn(NOTES_BRANCH)).toMatchObject({ [NESTED.value]: KEPT_CONTENT });
    });

    it("refuses to move a note onto a symlink", async () => {
        api.addEntry(NOTES_BRANCH, TAKEN.value, SYMLINK_MODE, OUTSIDE_TARGET);

        const move = repository.move(INBOX, TAKEN);

        await expect(move).rejects.toThrow(NoteAlreadyExists);
    });

    it("refuses to move a note onto a submodule", async () => {
        api.addEntry(NOTES_BRANCH, TAKEN.value, SUBMODULE_MODE, SUBMODULE_COMMIT);

        const move = repository.move(INBOX, TAKEN);

        await expect(move).rejects.toThrow(NoteAlreadyExists);
    });

    it("keeps the file mode of the note it moves", async () => {
        api.addEntry(NOTES_BRANCH, INBOX.value, EXECUTABLE_MODE, CONTENT);

        await repository.move(INBOX, TAKEN);

        expect(api.store.modesAt(NOTES_BRANCH).get(TAKEN.value)).toBe(EXECUTABLE_MODE);
    });

    it("gives up with ConcurrentChange when the branch keeps moving", async () => {
        api.commitBeforeRefUpdates(ALWAYS);

        const move = repository.move(INBOX, TAKEN);

        await expect(move).rejects.toThrow(ConcurrentChange);
    });

    it("does not retry a ref update rejected for another reason", async () => {
        api.dropBranchBeforeRefUpdates();

        const error = await failureOf(repository.move(INBOX, TAKEN));

        expect(error).toMatchObject({ name: NotesUnavailable.name, status: UNPROCESSABLE });
    });

    it("keeps the file mode of a nested note without reading the whole tree", async () => {
        api.addEntry(NOTES_BRANCH, NESTED_SOURCE.value, EXECUTABLE_MODE, CONTENT);
        api.truncateTrees();

        await repository.move(NESTED_SOURCE, TAKEN);

        expect(api.store.modesAt(NOTES_BRANCH).get(TAKEN.value)).toBe(EXECUTABLE_MODE);
    });
});
