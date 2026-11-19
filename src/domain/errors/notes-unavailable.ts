import { DomainError } from "./domain-error";

export class NotesUnavailable extends DomainError {
  constructor(readonly status?: number) {
    super(`The notes store is unavailable${status === undefined ? "" : ` (status ${status})`}`);
  }
}
