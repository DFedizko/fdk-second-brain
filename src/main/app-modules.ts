import type { ContainerModule } from "inversify";
import { createMcpModule } from "../adapters/inbound/mcp/mcp.container";
import { clockModule } from "../adapters/outbound/clock/clock.container";
import { githubContainer } from "../adapters/outbound/github/github.container";
import { toNotesRepoSettings } from "./config/config-settings";
import { createConfigModule } from "./config/config.container";
import type { AppConfig } from "./config/env-schema";
import { useCasesModule } from "./use-cases/use-cases.container";
import { USE_CASES } from "./use-cases/use-cases.symbols";

export type ModulesFactory = (config: AppConfig) => ContainerModule[];

export const appModules: ModulesFactory = (config) => [
  createConfigModule(config),
  githubContainer(toNotesRepoSettings(config)),
  clockModule,
  useCasesModule,
  createMcpModule(USE_CASES),
];
