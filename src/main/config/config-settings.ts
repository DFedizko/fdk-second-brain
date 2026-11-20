import type { NotesRepoSettings } from "../../shared/contracts/notes-repo-settings";
import type { OAuthSettings } from "../../shared/contracts/oauth-settings";
import type { WebhookSettings } from "../../shared/contracts/webhook-settings";
import type { AppConfig } from "./env-schema";

export function toNotesRepoSettings(config: AppConfig): NotesRepoSettings {
    return {
        token: config.GITHUB_TOKEN,
        owner: config.NOTES_REPO_OWNER,
        repo: config.NOTES_REPO_NAME,
        branch: config.NOTES_BRANCH,
        apiUrl: config.GITHUB_API_URL,
    };
}

export function toOAuthSettings(config: AppConfig): OAuthSettings {
    return {
        clientId: config.GITHUB_CLIENT_ID,
        clientSecret: config.GITHUB_CLIENT_SECRET,
        ownerId: config.OWNER_GITHUB_ID,
        publicUrl: config.PUBLIC_URL,
        oauthUrl: config.GITHUB_OAUTH_URL,
        apiUrl: config.GITHUB_API_URL,
    };
}

export function toWebhookSettings(config: AppConfig): WebhookSettings {
    return { secret: config.GITHUB_WEBHOOK_SECRET };
}
