import { Container } from "inversify";
import { ConsoleIndexFailureLog } from "../../../../src/adapters/outbound/logging/console-index-failure-log";
import { loggingModule } from "../../../../src/adapters/outbound/logging/logging.container";
import { LOGGING } from "../../../../src/adapters/outbound/logging/logging.symbols";

describe("loggingModule", () => {
  it("binds the index failure log to the Worker's console", () => {
    const container = new Container();
    container.load(loggingModule);

    const log = container.get(LOGGING.indexFailureLog);

    expect(log).toBeInstanceOf(ConsoleIndexFailureLog);
  });
});
