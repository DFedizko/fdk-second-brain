import { appModules } from "../../src/main/app-modules";
import { Bootstrap } from "../../src/main/bootstrap";
import { CONFIG_SYMBOLS } from "../../src/main/config/config.symbols";
import { FailingConfigParser } from "./__stub__/failing-config-parser";
import { VALID_ENV } from "./__stub__/valid-env";
import { SpyConfigParser } from "./__spy__/spy-config-parser";

const PARSE_ERROR = new Error("broken env");

describe("Bootstrap", () => {
  it("serves the parsed config through the container", () => {
    const bootstrap = new Bootstrap(new SpyConfigParser(), appModules);

    const container = bootstrap.start({ ...VALID_ENV });

    expect(container.get(CONFIG_SYMBOLS.AppConfig)).toEqual(VALID_ENV);
  });

  it("validates the same env bindings only once", () => {
    const parser = new SpyConfigParser();
    const bootstrap = new Bootstrap(parser, appModules);
    const env = { ...VALID_ENV };
    bootstrap.start(env);

    bootstrap.start(env);

    expect(parser.parsedEnvs).toEqual([env]);
  });

  it("reuses the container for the same env bindings", () => {
    const bootstrap = new Bootstrap(new SpyConfigParser(), appModules);
    const env = { ...VALID_ENV };
    const first = bootstrap.start(env);

    const second = bootstrap.start(env);

    expect(second).toBe(first);
  });

  it("validates new env bindings again", () => {
    const parser = new SpyConfigParser();
    const bootstrap = new Bootstrap(parser, appModules);
    bootstrap.start({ ...VALID_ENV });

    bootstrap.start({ ...VALID_ENV });

    expect(parser.parsedEnvs).toHaveLength(2);
  });

  it("fails fast with the validation error", () => {
    const parser = new FailingConfigParser(PARSE_ERROR);
    const bootstrap = new Bootstrap(parser, appModules);

    const start = () => bootstrap.start({});

    expect(start).toThrow(PARSE_ERROR);
  });
});
