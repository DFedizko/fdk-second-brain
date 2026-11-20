import type { NoteRepository } from "../../../../src/application/ports/note-repository";
import { NotesUnavailable } from "../../../../src/domain/errors/notes-unavailable";
import { NoteFolder } from "../../../../src/domain/note-folder";
import { NotePath } from "../../../../src/domain/note-path";
import { NoteVersion } from "../../../../src/domain/note-version";
import type { FakeGitHubApi } from "./__fake__/fake-github-api";
import { buildFakeNotesRepo } from "./__fake__/fake-notes-repo";
import { connectRepo } from "./__fake__/github-note-repo-on-fake";

const INBOX = NotePath.of("inbox.md");
const PLAN = NotePath.of("plan.md");
const CONTENT = "# Inbox\n";
const ANY_VERSION = NoteVersion.of("0000000000000000000000000000000000000000");
const ROOT = NoteFolder.of("");
const NOT_FOUND = 404;
const MISSING_BRANCH = "gone";
const MISSING_REPO = "lost";
const CREATING = "creating";

type RepoAction = (repository: NoteRepository) => Promise<unknown>;

const ACTIONS: [string, RepoAction][] = [
    ["listing", (repository) => repository.list(ROOT)],
    ["reading", (repository) => repository.read(INBOX)],
    [CREATING, (repository) => repository.create(INBOX, CONTENT)],
    ["writing", (repository) => repository.write(INBOX, CONTENT, ANY_VERSION)],
    ["deleting", (repository) => repository.delete(INBOX)],
    ["moving", (repository) => repository.move(INBOX, PLAN)],
];

const BRANCH_USES = ACTIONS.filter(([name]) => name !== CREATING);

async function failureOf(action: Promise<unknown>): Promise<unknown> {
    return action.then(
        () => undefined,
        (error: unknown) => error,
    );
}

describe("GitHubNoteRepo with a broken setup or limits", () => {
    let api: FakeGitHubApi;

    beforeEach(() => {
        api = buildFakeNotesRepo();
    });

    it.each(BRANCH_USES)("reports a missing branch as NotesUnavailable when %s", async (_name, act) => {
        const error = await failureOf(act(connectRepo(api, { branch: MISSING_BRANCH })));

        expect(error).toMatchObject({ name: NotesUnavailable.name, status: NOT_FOUND });
    });

    it.each(ACTIONS)("reports a missing repo as NotesUnavailable when %s", async (_name, act) => {
        const error = await failureOf(act(connectRepo(api, { repo: MISSING_REPO })));

        expect(error).toMatchObject({ name: NotesUnavailable.name, status: NOT_FOUND });
    });

    it("refuses a truncated tree instead of listing part of the notes", async () => {
        api.truncateTrees();

        const list = connectRepo(api).list(ROOT);

        await expect(list).rejects.toThrow(NotesUnavailable);
    });
});
