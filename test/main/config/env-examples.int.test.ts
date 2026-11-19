import { ENV_SCHEMA } from "../../../src/main/config/env-schema";

const EXAMPLE_FILES = [".env.example", ".dev.vars.example"];
const ASSIGNMENT = /^([A-Z0-9_]+)=/;
const LINE_BREAK = /\r?\n/;

async function variableNames(path: string): Promise<string[]> {
  const text = await Bun.file(path).text();
  return text
    .split(LINE_BREAK)
    .map((line) => ASSIGNMENT.exec(line)?.[1])
    .filter((name): name is string => name !== undefined)
    .sort();
}

describe("example env files", () => {
  it.each(EXAMPLE_FILES)("%s lists every variable", async (path) => {
    const names = await variableNames(path);

    expect(names).toEqual(Object.keys(ENV_SCHEMA.shape).sort());
  });
});
