import { Container } from "inversify";
import { createConfigModule } from "../../../src/main/config/config.container";
import { CONFIG_SYMBOLS } from "../../../src/main/config/config.symbols";
import type { AppConfig } from "../../../src/main/config/env-schema";
import { VALID_ENV } from "../__stub__/valid-env";

describe("createConfigModule", () => {
  it("binds the parsed config so other modules receive it", () => {
    const config: AppConfig = { ...VALID_ENV };
    const container = new Container();
    container.load(createConfigModule(config));

    const bound = container.get<AppConfig>(CONFIG_SYMBOLS.AppConfig);

    expect(bound).toBe(config);
  });
});
