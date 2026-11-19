import type { ContainerModule } from "inversify";
import { createConfigModule } from "./config/config.container";
import type { AppConfig } from "./config/env-schema";

export type ModulesFactory = (config: AppConfig) => ContainerModule[];

export const appModules: ModulesFactory = (config) => [createConfigModule(config)];
