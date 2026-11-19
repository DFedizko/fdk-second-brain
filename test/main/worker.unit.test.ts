import { InvalidEnvError } from "../../src/main/config/invalid-env-error";
import worker from "../../src/main/worker";
import { VALID_ENV } from "./__stub__/valid-env";

const NOT_FOUND = 404;
const ANY_URL = "https://second-brain.example/";

describe("worker", () => {
  it("answers not found while no route exists", () => {
    const env = { ...VALID_ENV } as unknown as Env;

    const response = worker.fetch(new Request(ANY_URL), env);

    expect(response.status).toBe(NOT_FOUND);
  });

  it("refuses to serve when the env is invalid", () => {
    const env = {} as Env;

    const serve = () => worker.fetch(new Request(ANY_URL), env);

    expect(serve).toThrow(InvalidEnvError);
  });
});
