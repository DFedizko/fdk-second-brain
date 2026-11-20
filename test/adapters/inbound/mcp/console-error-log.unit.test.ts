import type { Mock } from "bun:test";
import { ConsoleErrorLog } from "../../../../src/adapters/inbound/mcp/console-error-log";

const LABEL = "MCP tool failed:";

let printError: Mock<typeof console.error>;

beforeEach(() => {
    printError = jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
    printError.mockRestore();
});

describe("ConsoleErrorLog", () => {
    it("prints the error to the Worker's logs", () => {
        const log = new ConsoleErrorLog();
        const bug = new TypeError("boom");

        log.report(bug);

        expect(printError).toHaveBeenCalledWith(LABEL, bug);
    });
});
