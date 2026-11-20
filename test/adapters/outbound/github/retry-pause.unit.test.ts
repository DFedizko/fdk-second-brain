import { TimerPause } from "../../../../src/adapters/outbound/github/retry-pause";

const WAIT_MILLIS = 50;
const JUST_BEFORE = WAIT_MILLIS - 1;

describe("TimerPause", () => {
  let done: boolean;

  beforeEach(() => {
    jest.useFakeTimers();
    done = false;
    void new TimerPause().wait(WAIT_MILLIS).then(() => {
      done = true;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("is still waiting just before the time it was asked to wait", async () => {
    jest.advanceTimersByTime(JUST_BEFORE);

    await Promise.resolve();

    expect(done).toBe(false);
  });

  it("stops waiting once that time has passed", async () => {
    jest.advanceTimersByTime(WAIT_MILLIS);

    await Promise.resolve();

    expect(done).toBe(true);
  });
});
