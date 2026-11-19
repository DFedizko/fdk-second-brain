import { NotesStoreFailure } from "./notes-store-failure";

export class NotesRateLimited extends NotesStoreFailure {
  constructor(
    readonly resetsAt?: Date,
    readonly retryAfterSeconds?: number,
    cause?: unknown,
  ) {
    super("The notes store is rate limiting requests: try again later", cause);
  }
}
