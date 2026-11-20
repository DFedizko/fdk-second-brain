export class RequestBudgetSpent extends Error {
  override readonly name = "RequestBudgetSpent";

  constructor(readonly budget: number) {
    super(`Spent the budget of ${budget} GitHub requests for one queued path`);
  }
}
