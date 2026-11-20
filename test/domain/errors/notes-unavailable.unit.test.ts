import { NotesStoreFailure } from "../../../src/domain/errors/notes-store-failure";
import { NotesUnavailable } from "../../../src/domain/errors/notes-unavailable";

const SERVER_ERROR = 500;

describe("NotesUnavailable", () => {
    it("names the status when there is one", () => {
        const error = new NotesUnavailable(SERVER_ERROR);

        expect(error.message).toBe("The notes store is unavailable (status 500)");
    });

    it("omits the status when there is none", () => {
        const error = new NotesUnavailable();

        expect(error.message).toBe("The notes store is unavailable");
    });

    it("keeps the original failure as its cause", () => {
        const cause = new TypeError("fetch failed");

        const error = new NotesUnavailable(undefined, cause);

        expect(error.cause).toBe(cause);
    });

    it("is a failure of the notes store", () => {
        const error = new NotesUnavailable();

        expect(error).toBeInstanceOf(NotesStoreFailure);
    });
});
