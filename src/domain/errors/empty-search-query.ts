import { DomainError } from "./domain-error";

export class EmptySearchQuery extends DomainError {
    constructor(readonly query: string) {
        super(`The search "${query}" has no words to look for`);
    }
}
