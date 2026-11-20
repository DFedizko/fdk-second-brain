import { DomainError } from "./domain-error";

export class PassageNotUnique extends DomainError {
    constructor(
        readonly passage: string,
        readonly occurrences: number,
    ) {
        super(`Passage "${passage}" appears ${occurrences} times; give a longer, unique passage`);
    }
}
