import { DomainError } from "./domain-error";

export class PassageNotFound extends DomainError {
    constructor(readonly passage: string) {
        super(`Passage not found: "${passage}"`);
    }
}
