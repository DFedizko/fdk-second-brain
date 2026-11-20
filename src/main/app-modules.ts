import type { ContainerModule } from "inversify";
import { createMcpModule } from "../adapters/inbound/mcp/mcp.container";
import { clockModule } from "../adapters/outbound/clock/clock.container";
import { createD1SearchModule } from "../adapters/outbound/d1-search/d1-search.container";
import { githubContainer } from "../adapters/outbound/github/github.container";
import { loggingModule } from "../adapters/outbound/logging/logging.container";
import { toNotesRepoSettings } from "./config/config-settings";
import { createConfigModule } from "./config/config.container";
import type { AppConfig } from "./config/env-schema";
import { searchModule } from "./search/search.container";
import { SEARCH } from "./search/search.symbols";
import { useCasesModule } from "./use-cases/use-cases.container";
import { USE_CASES } from "./use-cases/use-cases.symbols";
import type { WorkerBindings } from "./worker-bindings";

const TOOL_USE_CASES = { ...USE_CASES, searchNotes: SEARCH.searchNotes };

export type ModulesFactory = (config: AppConfig, bindings: WorkerBindings) => ContainerModule[];

export const appModules: ModulesFactory = (config, bindings) => [
  createConfigModule(config),
  githubContainer(toNotesRepoSettings(config)),
  createD1SearchModule(bindings.DB),
  clockModule,
  loggingModule,
  searchModule,
  useCasesModule,
  createMcpModule(TOOL_USE_CASES),
];
