import { Container } from "inversify";
import { clockModule } from "../../../../src/adapters/outbound/clock/clock.container";
import { CLOCK } from "../../../../src/adapters/outbound/clock/clock.symbols";
import { SystemClock } from "../../../../src/adapters/outbound/clock/system-clock";

describe("clockModule", () => {
  it("binds the Clock port to the system clock", () => {
    const container = new Container();
    container.load(clockModule);

    const clock = container.get(CLOCK.clock);

    expect(clock).toBeInstanceOf(SystemClock);
  });
});
