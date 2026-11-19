import { SystemClock } from "../../../../src/adapters/outbound/clock/system-clock";

const NOW = new Date("2026-11-19T10:30:00.000Z");

describe("SystemClock", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("tells the current time", () => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    const clock = new SystemClock();

    const now = clock.now();

    expect(now).toEqual(NOW);
  });
});
