import { Octokit } from "@octokit/rest";
import { ContainerModule } from "inversify";
import type { Clock } from "../../../application/ports/clock";
import type { GitHubConfig } from "./github-config";
import { GitHubErrorTranslator, type GitHubErrorMapper } from "./github-error-translator";
import { GitHubGateway, type GitHubAccess } from "./github-gateway";
import { GitHubNoteMover, type NoteMover } from "./github-note-mover";
import { GitHubNoteReader, type NoteReader } from "./github-note-reader";
import { CommitCompare } from "./commit-compare";
import { GitHubBranchHead } from "./github-branch-head";
import { GitHubNoteCatalog } from "./github-note-catalog";
import { GitHubNoteRepo } from "./github-note-repo";
import { GITHUB } from "./github.symbols";
import { SILENT_LOG } from "./silent-log";
import { CLOCK } from "../clock/clock.symbols";

export function githubContainer(config: GitHubConfig): ContainerModule {
  return new ContainerModule(({ bind }) => {
    bind(GITHUB.config).toConstantValue(config);
    bind(GITHUB.client)
      .toResolvedValue(
        (settings: GitHubConfig) =>
          new Octokit({ auth: settings.token, baseUrl: settings.apiUrl, log: SILENT_LOG }),
        [GITHUB.config],
      )
      .inSingletonScope();
    bind(GITHUB.errorMapper).toResolvedValue(
      (clock: Clock) => new GitHubErrorTranslator(clock),
      [CLOCK.clock],
    );
    bind(GITHUB.access).toResolvedValue(
      (client: Octokit, settings: GitHubConfig, errors: GitHubErrorMapper) =>
        new GitHubGateway(client, settings, errors),
      [GITHUB.client, GITHUB.config, GITHUB.errorMapper],
    );
    bind(GITHUB.reader).toResolvedValue(
      (github: GitHubAccess) => new GitHubNoteReader(github),
      [GITHUB.access],
    );
    bind(GITHUB.mover).toResolvedValue(
      (github: GitHubAccess, reader: NoteReader) => new GitHubNoteMover(github, reader),
      [GITHUB.access, GITHUB.reader],
    );
    bind(GITHUB.noteRepository).toResolvedValue(
      (github: GitHubAccess, reader: NoteReader, mover: NoteMover) =>
        new GitHubNoteRepo(github, reader, mover),
      [GITHUB.access, GITHUB.reader, GITHUB.mover],
    );
    bind(GITHUB.branchHead).toResolvedValue(
      (github: GitHubAccess, reader: NoteReader) =>
        new GitHubBranchHead(reader, new CommitCompare(github)),
      [GITHUB.access, GITHUB.reader],
    );
    bind(GITHUB.noteCatalog).toResolvedValue(
      (github: GitHubAccess) => new GitHubNoteCatalog(github),
      [GITHUB.access],
    );
  });
}
