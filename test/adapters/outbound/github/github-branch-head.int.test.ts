import { GitHubBranchHead } from "../../../../src/adapters/outbound/github/github-branch-head";
import { GitHubErrorTranslator } from "../../../../src/adapters/outbound/github/github-error-translator";
import { GitHubGateway } from "../../../../src/adapters/outbound/github/github-gateway";
import { GitHubNoteReader } from "../../../../src/adapters/outbound/github/github-note-reader";
import { NoteNotFound } from "../../../../src/domain/errors/note-not-found";
import { NotesAccessDenied } from "../../../../src/domain/errors/notes-access-denied";
import { NotePath } from "../../../../src/domain/note-path";
import { FixedClock } from "../../../__stub__/fixed-clock";
import type { FakeGitHubApi } from "./__fake__/fake-github-api";
import { buildFakeNotesRepo, NOTES_BRANCH } from "./__fake__/fake-notes-repo";
import { FIXED_NOW } from "./__fake__/github-note-repo-on-fake";
import { GITHUB_CONFIG } from "./__stub__/github-config";

const PLAN = NotePath.of("projects/plan.md");
const IDEA = "ideas/idea.md";
const FILE_MODE = "100644";
const FIRST = "# Plan\n\nfirst\n";
const SECOND = "# Plan\n\nsecond\n";
const UNKNOWN_COMMIT = "abcdefabcdefabcdefabcdefabcdefabcdefabcd";

function connectHead(api: FakeGitHubApi): GitHubBranchHead {
  const errors = new GitHubErrorTranslator(new FixedClock(FIXED_NOW));
  const github = new GitHubGateway(api.octokit(GITHUB_CONFIG.token), GITHUB_CONFIG, errors);
  return new GitHubBranchHead(github, new GitHubNoteReader(github));
}

describe("GitHubBranchHead", () => {
  let api: FakeGitHubApi;
  let head: GitHubBranchHead;

  const headOf = () => api.store.headOf(NOTES_BRANCH) ?? "";
  const write = (path: string, content: string) =>
    api.addEntry(NOTES_BRANCH, path, FILE_MODE, content);

  beforeEach(() => {
    api = buildFakeNotesRepo();
    head = connectHead(api);
  });

  it("reads notes at the commit the branch points at", async () => {
    write(PLAN.value, FIRST);
    const reader = await head.readerAt(headOf());

    const note = await reader?.read(PLAN);

    expect(note?.content).toBe(FIRST);
  });

  it("reads the latest notes when asked about an older commit", async () => {
    write(PLAN.value, FIRST);
    const older = headOf();
    write(PLAN.value, SECOND);
    const reader = await head.readerAt(older);

    const note = await reader?.read(PLAN);

    expect(note?.content).toBe(SECOND);
  });

  it("gives no reader while the branch still shows a commit before the push", async () => {
    const shown = headOf();
    write(PLAN.value, FIRST);
    const pushed = headOf();
    api.store.setRef(NOTES_BRANCH, shown);

    const reader = await head.readerAt(pushed);

    expect(reader).toBeNull();
  });

  it("gives no reader for a commit GitHub does not know yet", async () => {
    const reader = await head.readerAt(UNKNOWN_COMMIT);

    expect(reader).toBeNull();
  });

  it("keeps reading the commit it checked when the branch view changes afterwards", async () => {
    write(PLAN.value, FIRST);
    const withPlan = headOf();
    const files = new Map(api.store.filesAt(NOTES_BRANCH));
    files.delete(PLAN.value);
    const deleted = api.store.advance(NOTES_BRANCH, files, "Delete plan").sha;
    const reader = await head.readerAt(deleted);
    api.store.setRef(NOTES_BRANCH, withPlan);

    const read = reader?.read(PLAN);

    await expect(read).rejects.toThrow(NoteNotFound);
  });

  it("checks the head once even when it already is the pushed commit", async () => {
    write(IDEA, FIRST);
    const before = api.served.length;

    await head.readerAt(headOf());

    expect(api.served.length - before).toBe(1);
  });

  it("reports other GitHub failures", async () => {
    api.revokeToken();

    const reader = head.readerAt(UNKNOWN_COMMIT);

    await expect(reader).rejects.toThrow(NotesAccessDenied);
  });
});
