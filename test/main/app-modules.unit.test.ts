import { Container } from "inversify";
import { appModules } from "../../src/main/app-modules";
import { CONFIG_SYMBOLS } from "../../src/main/config/config.symbols";
import type { AppConfig } from "../../src/main/config/env-schema";
import { VALID_ENV } from "./__stub__/valid-env";

describe("appModules", () => {
  it("includes the config module", () => {
    const config: AppConfig = { ...VALID_ENV };
    const container = new Container();

    container.load(...appModules(config));

    expect(container.get(CONFIG_SYMBOLS.AppConfig)).toBe(config);
  });
});
