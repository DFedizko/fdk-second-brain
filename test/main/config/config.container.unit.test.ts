import { Container } from "inversify";
import { createConfigModule } from "../../../src/main/config/config.container";
import { CONFIG_SYMBOLS } from "../../../src/main/config/config.symbols";
import type { AppConfig } from "../../../src/main/config/env-schema";
import type { NotesRepoSettings } from "../../../src/shared/contracts/notes-repo-settings";
import type { OAuthSettings } from "../../../src/shared/contracts/oauth-settings";
import type { WebhookSettings } from "../../../src/shared/contracts/webhook-settings";
import { VALID_ENV } from "../__stub__/valid-env";

function containerWith(config: AppConfig): Container {
    const container = new Container();
    container.load(createConfigModule(config));
    return container;
}

describe("createConfigModule", () => {
    it("binds the parsed config so other modules receive it", () => {
        const config: AppConfig = { ...VALID_ENV };
        const container = containerWith(config);

        const bound = container.get<AppConfig>(CONFIG_SYMBOLS.AppConfig);

        expect(bound).toBe(config);
    });

    it("binds the notes repository settings", () => {
        const container = containerWith({ ...VALID_ENV });

        const settings = container.get<NotesRepoSettings>(CONFIG_SYMBOLS.NotesRepoSettings);

        expect(settings.repo).toBe(VALID_ENV.NOTES_REPO_NAME);
    });

    it("binds the OAuth settings", () => {
        const container = containerWith({ ...VALID_ENV });

        const settings = container.get<OAuthSettings>(CONFIG_SYMBOLS.OAuthSettings);

        expect(settings.clientId).toBe(VALID_ENV.GITHUB_CLIENT_ID);
    });

    it("binds the webhook settings", () => {
        const container = containerWith({ ...VALID_ENV });

        const settings = container.get<WebhookSettings>(CONFIG_SYMBOLS.WebhookSettings);

        expect(settings.secret).toBe(VALID_ENV.GITHUB_WEBHOOK_SECRET);
    });
});
