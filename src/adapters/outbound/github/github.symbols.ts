import type { ServiceIdentifier } from "inversify";
import type { NoteRepository } from "../../../application/ports/note-repository";
import type { Octokit } from "@octokit/rest";
import type { GitHubConfig } from "./github-config";
import type { GitHubErrorMapper } from "./github-error-translator";

export const GITHUB = {
  config: Symbol.for("GitHubConfig") as ServiceIdentifier<GitHubConfig>,
  client: Symbol.for("GitHubClient") as ServiceIdentifier<Octokit>,
  errorMapper: Symbol.for("GitHubErrorMapper") as ServiceIdentifier<GitHubErrorMapper>,
  noteRepository: Symbol.for("NoteRepository") as ServiceIdentifier<NoteRepository>,
} as const;
