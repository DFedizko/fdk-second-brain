import { DomainError } from "./domain-error";

export class NotesRateLimited extends DomainError {
  constructor(
    readonly resetsAt?: Date,
    readonly retryAfterSeconds?: number,
  ) {
    super("The notes store is rate limiting requests: try again later");
  }
}
