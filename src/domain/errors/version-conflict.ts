import { DomainError } from "./domain-error";

export class VersionConflict extends DomainError {
    constructor(
        readonly path: string,
        readonly expected: string,
        readonly actual: string,
    ) {
        super(`Note "${path}" changed: expected version ${expected}, found ${actual}`);
    }
}
