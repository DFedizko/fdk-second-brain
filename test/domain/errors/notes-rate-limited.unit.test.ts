import { NotesRateLimited } from "../../../src/domain/errors/notes-rate-limited";

const RESET = new Date("2026-11-19T12:00:00Z");
const RETRY_AFTER_SECONDS = 60;

describe("NotesRateLimited", () => {
  it("keeps when to try again", () => {
    const error = new NotesRateLimited(RESET, RETRY_AFTER_SECONDS);

    expect({ resetsAt: error.resetsAt, retry: error.retryAfterSeconds }).toEqual({
      resetsAt: RESET,
      retry: RETRY_AFTER_SECONDS,
    });
  });

  it("is named after its class", () => {
    const error = new NotesRateLimited();

    expect(error.name).toBe("NotesRateLimited");
  });
});
