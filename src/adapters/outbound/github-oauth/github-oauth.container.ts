import { ContainerModule } from "inversify";
import type { OAuthSettings } from "../../../shared/contracts/oauth-settings";
import { GitHubIdentity, type HttpFetch } from "./github-identity";
import { GITHUB_OAUTH } from "./github-oauth.symbols";

export function createGitHubOAuthModule(settings: OAuthSettings): ContainerModule {
    return new ContainerModule(({ bind }) => {
        bind(GITHUB_OAUTH.http).toConstantValue((input, init) => fetch(input, init));
        bind(GITHUB_OAUTH.identity)
            .toResolvedValue((http: HttpFetch) => new GitHubIdentity(settings, http), [GITHUB_OAUTH.http])
            .inSingletonScope();
    });
}
