import { ContainerModule } from "inversify";
import { CONFIG_SYMBOLS } from "./config.symbols";
import type { AppConfig } from "./env-schema";

export function createConfigModule(config: AppConfig): ContainerModule {
  return new ContainerModule(({ bind }) => {
    bind<AppConfig>(CONFIG_SYMBOLS.AppConfig).toConstantValue(config);
  });
}
