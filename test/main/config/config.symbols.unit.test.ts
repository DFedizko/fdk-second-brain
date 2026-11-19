import { CONFIG_SYMBOLS } from "../../../src/main/config/config.symbols";

describe("CONFIG_SYMBOLS", () => {
  it("keeps the config symbol out of the global symbol registry", () => {
    const key = Symbol.keyFor(CONFIG_SYMBOLS.AppConfig);

    expect(key).toBeUndefined();
  });
});
