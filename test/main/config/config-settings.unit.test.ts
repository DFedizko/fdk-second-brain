import {
  toNotesRepoSettings,
  toOAuthSettings,
  toWebhookSettings,
} from "../../../src/main/config/config-settings";
import type { AppConfig } from "../../../src/main/config/env-schema";
import { VALID_ENV } from "../__stub__/valid-env";

const CONFIG: AppConfig = { ...VALID_ENV };

describe("config settings", () => {
  it("gives the GitHub adapter only the notes repository settings", () => {
    const settings = toNotesRepoSettings(CONFIG);

    expect(settings).toEqual({
      token: VALID_ENV.GITHUB_TOKEN,
      owner: VALID_ENV.NOTES_REPO_OWNER,
      repo: VALID_ENV.NOTES_REPO_NAME,
      branch: VALID_ENV.NOTES_BRANCH,
      apiUrl: VALID_ENV.GITHUB_API_URL,
    });
  });

  it("gives the sign-in adapter only the OAuth settings", () => {
    const settings = toOAuthSettings(CONFIG);

    expect(settings).toEqual({
      clientId: VALID_ENV.GITHUB_CLIENT_ID,
      clientSecret: VALID_ENV.GITHUB_CLIENT_SECRET,
      ownerLogin: VALID_ENV.OWNER_GITHUB_LOGIN,
      cookieEncryptionKey: VALID_ENV.COOKIE_ENCRYPTION_KEY,
      publicUrl: VALID_ENV.PUBLIC_URL,
      oauthUrl: VALID_ENV.GITHUB_OAUTH_URL,
      apiUrl: VALID_ENV.GITHUB_API_URL,
    });
  });

  it("gives the webhook adapter only the webhook secret", () => {
    const settings = toWebhookSettings(CONFIG);

    expect(settings).toEqual({ secret: VALID_ENV.GITHUB_WEBHOOK_SECRET });
  });
});
