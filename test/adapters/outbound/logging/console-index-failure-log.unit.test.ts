import type { Mock } from "bun:test";
import { ConsoleIndexFailureLog } from "../../../../src/adapters/outbound/logging/console-index-failure-log";

const LABEL = "Search index update failed:";
const PATH = "projects/plan.md";

let printError: Mock<typeof console.error>;

beforeEach(() => {
  printError = jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  printError.mockRestore();
});

describe("ConsoleIndexFailureLog", () => {
  it("prints the path and the error to the Worker's logs", () => {
    const log = new ConsoleIndexFailureLog();
    const error = new Error("D1 is down");

    log.report({ path: PATH, error });

    expect(printError).toHaveBeenCalledWith(LABEL, PATH, error);
  });
});
