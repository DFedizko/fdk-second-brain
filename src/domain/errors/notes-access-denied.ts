import { DomainError } from "./domain-error";

export class NotesAccessDenied extends DomainError {
  constructor() {
    super("The notes store refused access: check the token and its permissions");
  }
}
