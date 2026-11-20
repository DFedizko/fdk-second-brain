import type { ServiceIdentifier } from "inversify";
import type { BranchHead } from "../../../application/ports/branch-head";
import type { NoteTree } from "../../../application/ports/note-tree";
import type { NoteRepository } from "../../../application/ports/note-repository";
import type { Octokit } from "@octokit/rest";
import type { BranchRestorer } from "./github-branch-restorer";
import type { GitHubConfig } from "./github-config";
import type { GitHubErrorMapper } from "./github-error-translator";
import type { FirstNoteWriter } from "./github-first-note";
import type { GitHubAccess } from "./github-gateway";
import type { NoteMover } from "./github-note-mover";
import type { NoteReader } from "./github-note-reader";
import type { RetryPause } from "./retry-pause";

export const GITHUB = {
  config: Symbol.for("GitHubConfig") as ServiceIdentifier<GitHubConfig>,
  client: Symbol.for("GitHubClient") as ServiceIdentifier<Octokit>,
  errorMapper: Symbol.for("GitHubErrorMapper") as ServiceIdentifier<GitHubErrorMapper>,
  access: Symbol.for("GitHubAccess") as ServiceIdentifier<GitHubAccess>,
  reader: Symbol.for("GitHubNoteReader") as ServiceIdentifier<NoteReader>,
  mover: Symbol.for("GitHubNoteMover") as ServiceIdentifier<NoteMover>,
  firstNote: Symbol.for("GitHubFirstNote") as ServiceIdentifier<FirstNoteWriter>,
  restorer: Symbol.for("GitHubBranchRestorer") as ServiceIdentifier<BranchRestorer>,
  pause: Symbol.for("GitHubRetryPause") as ServiceIdentifier<RetryPause>,
  noteRepository: Symbol.for("NoteRepository") as ServiceIdentifier<NoteRepository>,
  noteCatalog: Symbol.for("GitHubNoteCatalog") as ServiceIdentifier<NoteTree>,
  branchHead: Symbol.for("GitHubBranchHead") as ServiceIdentifier<BranchHead>,
} as const;
