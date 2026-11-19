import { NotesStoreFailure } from "./notes-store-failure";

export class NotesUnavailable extends NotesStoreFailure {
  constructor(
    readonly status?: number,
    cause?: unknown,
  ) {
    super(
      `The notes store is unavailable${status === undefined ? "" : ` (status ${status})`}`,
      cause,
    );
  }
}
