import { DomainError } from "./domain-error";

export class NoteNotFound extends DomainError {
    constructor(readonly path: string) {
        super(`Note not found: "${path}"`);
    }
}
