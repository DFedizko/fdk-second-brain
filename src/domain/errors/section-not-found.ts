import { DomainError } from "./domain-error";

export class SectionNotFound extends DomainError {
    constructor(readonly heading: string) {
        super(`No section with the heading "${heading}"`);
    }
}
