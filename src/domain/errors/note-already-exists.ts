import { DomainError } from "./domain-error";

export class NoteAlreadyExists extends DomainError {
  constructor(readonly path: string) {
    super(`Note already exists: "${path}"`);
  }
}
