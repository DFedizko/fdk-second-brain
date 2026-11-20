import { DomainError } from "./domain-error";

export class BranchBehind extends DomainError {
    constructor(readonly commit: string) {
        super(`The notes branch has not reached commit ${commit} yet`);
    }
}
