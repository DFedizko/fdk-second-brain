import { DomainError } from "./domain-error";

export class IndexWriteConflict extends DomainError {
  constructor(readonly path: string) {
    super(`The search index for "${path}" kept changing while it was updated: try again`);
  }
}
