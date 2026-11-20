import { EnvConfigParser } from "../../../src/main/config/env-config-parser";
import { InvalidEnvError } from "../../../src/main/config/invalid-env-error";
import { VALID_ENV } from "../__stub__/valid-env";

const BROKEN_ENV = {
  ...VALID_ENV,
  GITHUB_TOKEN: undefined,
  GITHUB_WEBHOOK_SECRET: "short",
};
const TOKEN_MISSING = "GITHUB_TOKEN is missing";
const KEY_INVALID = "GITHUB_WEBHOOK_SECRET is invalid";

function captureError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe("EnvConfigParser", () => {
  it("turns a valid env into typed config", () => {
    const parser = new EnvConfigParser();

    const config = parser.parse(VALID_ENV);

    expect(config).toEqual(VALID_ENV);
  });

  it("fails with an InvalidEnvError when the env is invalid", () => {
    const parser = new EnvConfigParser();

    const error = captureError(() => parser.parse(BROKEN_ENV));

    expect(error).toBeInstanceOf(InvalidEnvError);
  });

  it("reports every problem at once", () => {
    const parser = new EnvConfigParser();

    const error = captureError(() => parser.parse(BROKEN_ENV));

    expect((error as InvalidEnvError).problems).toEqual([
      expect.stringMatching(new RegExp(`^${TOKEN_MISSING}`)),
      expect.stringMatching(new RegExp(`^${KEY_INVALID}`)),
    ]);
  });

  it("lists every problem in the error message", () => {
    const parser = new EnvConfigParser();

    const error = captureError(() => parser.parse(BROKEN_ENV));

    expect((error as InvalidEnvError).message).toMatch(
      new RegExp(`${TOKEN_MISSING}[\\s\\S]*${KEY_INVALID}`),
    );
  });
});
