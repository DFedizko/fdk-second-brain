import type { FailureContext } from "./github-error-translator";
import type { GitHubAccess, GitHubRequest } from "./github-gateway";
import { RequestBudgetSpent } from "./request-budget-spent";

export class BudgetedGitHub implements GitHubAccess {
  private spent = 0;

  constructor(
    private readonly github: GitHubAccess,
    private readonly budget: number,
  ) {}

  get branch(): string {
    return this.github.branch;
  }

  get branchRef(): string {
    return this.github.branchRef;
  }

  async send<T>(context: FailureContext, request: GitHubRequest<T>): Promise<T> {
    if (this.spent >= this.budget) throw new RequestBudgetSpent(this.budget);
    this.spent += 1;
    return this.github.send(context, request);
  }
}
