import { IdeaPath } from "../../src/domain/idea-path";
import { Slug } from "../../src/domain/slug";

const CREATED_AT = new Date("2026-11-19T15:30:00Z");
const FIRST_ATTEMPT = 1;
const THIRD_ATTEMPT = 3;

describe("IdeaPath", () => {
  it("names the first attempt by date and slug", () => {
    const idea = new IdeaPath(CREATED_AT, Slug.from("Garden plan"));

    expect(idea.attempt(FIRST_ATTEMPT).value).toBe("ideas/2026-11-19-garden-plan.md");
  });

  it("adds the attempt number after the first", () => {
    const idea = new IdeaPath(CREATED_AT, Slug.from("Garden plan"));

    expect(idea.attempt(THIRD_ATTEMPT).value).toBe("ideas/2026-11-19-garden-plan-3.md");
  });
});
