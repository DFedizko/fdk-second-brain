import { ContainerModule } from "inversify";
import type { NotesRepoSettings } from "../../shared/contracts/notes-repo-settings";
import type { OAuthSettings } from "../../shared/contracts/oauth-settings";
import type { WebhookSettings } from "../../shared/contracts/webhook-settings";
import { toNotesRepoSettings, toOAuthSettings, toWebhookSettings } from "./config-settings";
import { CONFIG_SYMBOLS } from "./config.symbols";
import type { AppConfig } from "./env-schema";

const FROM_CONFIG: [symbol] = [CONFIG_SYMBOLS.AppConfig];

export function createConfigModule(config: AppConfig): ContainerModule {
  return new ContainerModule(({ bind }) => {
    bind<AppConfig>(CONFIG_SYMBOLS.AppConfig).toConstantValue(config);
    bind<NotesRepoSettings>(CONFIG_SYMBOLS.NotesRepoSettings)
      .toResolvedValue(toNotesRepoSettings, FROM_CONFIG)
      .inSingletonScope();
    bind<OAuthSettings>(CONFIG_SYMBOLS.OAuthSettings)
      .toResolvedValue(toOAuthSettings, FROM_CONFIG)
      .inSingletonScope();
    bind<WebhookSettings>(CONFIG_SYMBOLS.WebhookSettings)
      .toResolvedValue(toWebhookSettings, FROM_CONFIG)
      .inSingletonScope();
  });
}
