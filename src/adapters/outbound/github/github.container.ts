import { Octokit } from "@octokit/rest";
import { ContainerModule } from "inversify";
import type { Clock } from "../../../application/ports/clock";
import type { GitHubConfig } from "./github-config";
import { GitHubBranchRestorer, type BranchRestorer } from "./github-branch-restorer";
import { GitHubErrorTranslator, type GitHubErrorMapper } from "./github-error-translator";
import { GitHubFirstNote, type FirstNoteWriter } from "./github-first-note";
import { GitHubGateway, type GitHubAccess } from "./github-gateway";
import { GitHubNoteMover, type NoteMover } from "./github-note-mover";
import { GitHubNoteReader, type NoteReader } from "./github-note-reader";
import { CommitCompare } from "./commit-compare";
import { GitHubBranchHead } from "./github-branch-head";
import { GitHubNoteCatalog } from "./github-note-catalog";
import { GitHubNoteRepo } from "./github-note-repo";
import { GITHUB } from "./github.symbols";
import { TimerPause, type RetryPause } from "./retry-pause";
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
    bind(GITHUB.firstNote).toResolvedValue(
      (github: GitHubAccess, reader: NoteReader) => new GitHubFirstNote(github, reader),
      [GITHUB.access, GITHUB.reader],
    );
    bind(GITHUB.pause).toConstantValue(new TimerPause());
    bind(GITHUB.restorer).toResolvedValue(
      (github: GitHubAccess) => new GitHubBranchRestorer(github),
      [GITHUB.access],
    );
    bind(GITHUB.noteRepository).toResolvedValue(
      (
        github: GitHubAccess,
        reader: NoteReader,
        mover: NoteMover,
        first: FirstNoteWriter,
        pause: RetryPause,
        restorer: BranchRestorer,
      ) => new GitHubNoteRepo(github, reader, mover, first, pause, restorer),
      [GITHUB.access, GITHUB.reader, GITHUB.mover, GITHUB.firstNote, GITHUB.pause, GITHUB.restorer],
    );
    bind(GITHUB.branchHead).toResolvedValue(
      (github: GitHubAccess, reader: NoteReader) =>
        new GitHubBranchHead(reader, new CommitCompare(github)),
      [GITHUB.access, GITHUB.reader],
    );
    bind(GITHUB.noteCatalog).toResolvedValue(
      (github: GitHubAccess, reader: NoteReader) => new GitHubNoteCatalog(github, reader),
      [GITHUB.access, GITHUB.reader],
    );
  });
}
