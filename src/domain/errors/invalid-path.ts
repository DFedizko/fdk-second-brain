import { DomainError } from "./domain-error";

export class InvalidPath extends DomainError {
  constructor(
    readonly path: string,
    reason: string,
  ) {
    super(`Invalid note path "${path}": ${reason}`);
  }
}
