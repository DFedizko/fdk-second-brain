import { InvalidEnvError } from "../../../src/main/config/invalid-env-error";

const PROBLEMS = ["A is missing: set it.", "B is invalid: expected x."];
const EXPECTED_MESSAGE =
  "The Worker's environment is invalid:\n- A is missing: set it.\n- B is invalid: expected x.";

describe("InvalidEnvError", () => {
  it("lists each problem on its own line", () => {
    const error = new InvalidEnvError(PROBLEMS);

    expect(error.message).toBe(EXPECTED_MESSAGE);
  });

  it("names itself so logs show which error it is", () => {
    const error = new InvalidEnvError(PROBLEMS);

    expect(error.name).toBe("InvalidEnvError");
  });
});
