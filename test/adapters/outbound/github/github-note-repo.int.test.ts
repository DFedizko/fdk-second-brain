import { describeNoteRepository } from "../../../application/ports/note-repo.contract";
import { buildFakeNotesRepo } from "./__fake__/fake-notes-repo";
import { connectRepo } from "./__fake__/github-note-repo-on-fake";

describeNoteRepository("GitHubNoteRepo on the GitHub API", () => connectRepo(buildFakeNotesRepo()));
