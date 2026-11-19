import worker from "../../src/main/worker";

const NOT_FOUND = 404;

describe("worker", () => {
  it("answers not found while no route exists", () => {
    const response = worker.fetch();

    expect(response.status).toBe(NOT_FOUND);
  });
});
