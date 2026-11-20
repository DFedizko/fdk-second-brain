import { Container } from "inversify";
import { MCP } from "../../src/adapters/inbound/mcp/mcp.symbols";
import { D1_SEARCH_SYMBOLS } from "../../src/adapters/outbound/d1-search/d1-search.symbols";
import { appModules } from "../../src/main/app-modules";
import { CONFIG_SYMBOLS } from "../../src/main/config/config.symbols";
import type { AppConfig } from "../../src/main/config/env-schema";
import { VALID_ENV } from "./__stub__/valid-env";
import { WORKER_ENV } from "./__stub__/worker-env";

describe("appModules", () => {
  it("includes the config module", () => {
    const config: AppConfig = { ...VALID_ENV };
    const container = new Container();

    container.load(...appModules(config, WORKER_ENV));

    expect(container.get(CONFIG_SYMBOLS.AppConfig)).toBe(config);
  });

  it("wires the MCP HTTP handler down to the note repository", () => {
    const container = new Container();

    container.load(...appModules({ ...VALID_ENV }, WORKER_ENV));

    expect(container.get(MCP.httpHandler).fetch).toBeFunction();
  });

  it("keeps the search index in the Worker's D1 database", () => {
    const container = new Container();

    container.load(...appModules({ ...VALID_ENV }, WORKER_ENV));

    expect(container.get(D1_SEARCH_SYMBOLS.Database)).toBe(WORKER_ENV.DB);
  });
});
