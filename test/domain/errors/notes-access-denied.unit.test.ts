import { NotesAccessDenied } from "../../../src/domain/errors/notes-access-denied";

describe("NotesAccessDenied", () => {
    it("tells to check the token without showing it", () => {
        const error = new NotesAccessDenied();

        expect(error.message).toBe("The notes store refused access: check the token and its permissions");
    });

    it("keeps the original failure as its cause", () => {
        const cause = new Error("Bad credentials");

        const error = new NotesAccessDenied(cause);

        expect(error.cause).toBe(cause);
    });
});
