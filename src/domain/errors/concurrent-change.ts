import { DomainError } from "./domain-error";

export class ConcurrentChange extends DomainError {
    constructor(readonly path: string) {
        super(`Note "${path}" was not saved: the notes kept changing at the same time, try again`);
    }
}
