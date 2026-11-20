import { BudgetedGitHub } from "./budgeted-github";
import { CommitCompare } from "./commit-compare";
import { ForwardHeadNotes } from "./forward-head-notes";
import type { GitHubAccess } from "./github-gateway";
import type { HeadNotesFactory, PinnableNotes } from "./head-notes-factory";
import { GitHubNoteReader } from "./github-note-reader";

const FREE_PLAN_SUBREQUESTS = 50;
const QUEUE_BATCH_SIZE = 5;
export const REQUESTS_PER_MESSAGE = FREE_PLAN_SUBREQUESTS / QUEUE_BATCH_SIZE;

export class BudgetedHeadNotes implements HeadNotesFactory {
  constructor(
    private readonly github: GitHubAccess,
    private readonly budget: number,
  ) {}

  create(): PinnableNotes {
    const github = new BudgetedGitHub(this.github, this.budget);
    return new ForwardHeadNotes(new GitHubNoteReader(github), new CommitCompare(github));
  }
}
