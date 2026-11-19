import { DomainError } from "./domain-error";

export class UnreadableNote extends DomainError {
  constructor(readonly path: string) {
    super(`Note "${path}" is not valid UTF-8 text`);
  }
}
