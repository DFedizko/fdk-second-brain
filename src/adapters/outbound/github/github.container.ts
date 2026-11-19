import { Octokit } from "@octokit/rest";
import { ContainerModule } from "inversify";
import type { GitHubConfig } from "./github-config";
import { GitHubErrorTranslator, type GitHubErrorMapper } from "./github-error-translator";
import { GitHubNoteRepo } from "./github-note-repo";
import { GITHUB } from "./github.symbols";

export function githubContainer(config: GitHubConfig): ContainerModule {
  return new ContainerModule(({ bind }) => {
    bind(GITHUB.config).toConstantValue(config);
    bind(GITHUB.client)
      .toResolvedValue(
        (settings: GitHubConfig) => new Octokit({ auth: settings.token }),
        [GITHUB.config],
      )
      .inSingletonScope();
    bind(GITHUB.errorMapper).toResolvedValue(() => new GitHubErrorTranslator());
    bind(GITHUB.noteRepository).toResolvedValue(
      (client: Octokit, settings: GitHubConfig, errors: GitHubErrorMapper) =>
        new GitHubNoteRepo(client, settings, errors),
      [GITHUB.client, GITHUB.config, GITHUB.errorMapper],
    );
  });
}
