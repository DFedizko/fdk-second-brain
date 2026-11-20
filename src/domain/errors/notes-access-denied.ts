import { NotesStoreFailure } from "./notes-store-failure";

export class NotesAccessDenied extends NotesStoreFailure {
    constructor(cause?: unknown) {
        super("The notes store refused access: check the token and its permissions", cause);
    }
}
