import type { CallToolResult } from "@modelcontextprotocol/server";
import { DomainError } from "../../../domain/errors/domain-error";
import { NoteAlreadyExists } from "../../../domain/errors/note-already-exists";
import { NoteNotFound } from "../../../domain/errors/note-not-found";
import { NotesStoreFailure } from "../../../domain/errors/notes-store-failure";
import { VersionConflict } from "../../../domain/errors/version-conflict";

const UNEXPECTED_MESSAGE = "Something went wrong on the server. Try again later.";
const STORE_DOWN_MESSAGE = "The notes can't be reached right now. Try again in a few minutes.";
const HINT_SEPARATOR = ". ";
const NO_HINT = "";

type ErrorClass = abstract new (...args: never[]) => DomainError;

const HINTS: ReadonlyArray<readonly [ErrorClass, string]> = [
  [NoteNotFound, "Call list_notes to see the paths."],
  [VersionConflict, "Read the note again and retry with its current version."],
  [
    NoteAlreadyExists,
    "Use a free path, or replace it with write_note and the expectedVersion from read_note.",
  ],
];

export interface ErrorResultMapper {
  toResult(error: unknown): CallToolResult;
}

export class ToolErrorMapper implements ErrorResultMapper {
  toResult(error: unknown): CallToolResult {
    return { isError: true, content: [{ type: "text", text: this.describe(error) }] };
  }

  private describe(error: unknown): string {
    if (!(error instanceof DomainError)) return UNEXPECTED_MESSAGE;
    if (error instanceof NotesStoreFailure) return STORE_DOWN_MESSAGE;
    const hint = this.findHint(error);
    return hint === NO_HINT ? error.message : `${error.message}${HINT_SEPARATOR}${hint}`;
  }

  private findHint(error: DomainError): string {
    return HINTS.find(([kind]) => error instanceof kind)?.[1] ?? NO_HINT;
  }
}
