import type { ServiceIdentifier } from "inversify";
import type { IdentityProvider } from "../../../shared/contracts/identity-provider";
import type { HttpFetch } from "./github-identity";

export const GITHUB_OAUTH = {
  http: Symbol.for("GitHubOAuthHttp") as ServiceIdentifier<HttpFetch>,
  identity: Symbol.for("GitHubIdentity") as ServiceIdentifier<IdentityProvider>,
} as const;
