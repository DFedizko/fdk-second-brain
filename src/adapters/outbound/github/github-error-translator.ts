import { NoteAlreadyExists } from "../../../domain/errors/note-already-exists";
import { NoteNotFound } from "../../../domain/errors/note-not-found";
import { NotesAccessDenied } from "../../../domain/errors/notes-access-denied";
import { NotesRateLimited } from "../../../domain/errors/notes-rate-limited";
import { NotesUnavailable } from "../../../domain/errors/notes-unavailable";
import { VersionConflict } from "../../../domain/errors/version-conflict";

const UNAUTHORIZED = 401;
const FORBIDDEN = 403;
const NOT_FOUND = 404;
const CONFLICT = 409;
const UNPROCESSABLE = 422;
const TOO_MANY_REQUESTS = 429;
const NO_REQUESTS_LEFT = "0";
const MILLIS_PER_SECOND = 1000;
const RATE_LIMIT_MESSAGE = /rate limit/i;
const SHA_MISSING = /"sha" wasn't supplied/;
const NOT_FAST_FORWARD = /not a fast forward/i;
const NEWER_VERSION = "a newer version";

export interface FailureContext {
  readonly path?: string;
  readonly expected?: string;
}

export interface GitHubErrorMapper {
  toDomainError(error: unknown, context: FailureContext): Error;
}

interface HttpFailure {
  readonly status: number;
  readonly headers: Readonly<Record<string, string | number | undefined>>;
  readonly message: string;
}

export class GitHubErrorTranslator implements GitHubErrorMapper {
  toDomainError(error: unknown, context: FailureContext): Error {
    const failure = this.readFailure(error);
    if (!failure) return new NotesUnavailable();
    if (this.isRateLimit(failure)) return this.rateLimited(failure);
    return this.byStatus(failure, context);
  }

  private byStatus(failure: HttpFailure, context: FailureContext): Error {
    switch (failure.status) {
      case UNAUTHORIZED:
      case FORBIDDEN:
        return new NotesAccessDenied();
      case NOT_FOUND:
        return this.notFound(failure, context);
      case CONFLICT:
        return this.conflict(failure, context);
      case UNPROCESSABLE:
        return this.unprocessable(failure, context);
      default:
        return new NotesUnavailable(failure.status);
    }
  }

  private unprocessable(failure: HttpFailure, context: FailureContext): Error {
    if (context.path !== undefined && SHA_MISSING.test(failure.message)) {
      return new NoteAlreadyExists(context.path);
    }
    if (NOT_FAST_FORWARD.test(failure.message)) return this.conflict(failure, context);
    return new NotesUnavailable(failure.status);
  }

  private conflict(failure: HttpFailure, context: FailureContext): Error {
    const { path, expected } = context;
    if (path === undefined || expected === undefined) return new NotesUnavailable(failure.status);
    return new VersionConflict(path, expected, NEWER_VERSION);
  }

  private notFound(failure: HttpFailure, context: FailureContext): Error {
    if (context.path === undefined) return new NotesUnavailable(failure.status);
    return new NoteNotFound(context.path);
  }

  private isRateLimit(failure: HttpFailure): boolean {
    if (failure.status === TOO_MANY_REQUESTS) return true;
    if (failure.status !== FORBIDDEN) return false;
    return (
      String(failure.headers["x-ratelimit-remaining"]) === NO_REQUESTS_LEFT ||
      failure.headers["retry-after"] !== undefined ||
      RATE_LIMIT_MESSAGE.test(failure.message)
    );
  }

  private rateLimited(failure: HttpFailure): NotesRateLimited {
    const reset = this.numberHeader(failure, "x-ratelimit-reset");
    const retryAfter = this.numberHeader(failure, "retry-after");
    const resetsAt = reset === undefined ? undefined : new Date(reset * MILLIS_PER_SECOND);
    return new NotesRateLimited(resetsAt, retryAfter);
  }

  private numberHeader(failure: HttpFailure, name: string): number | undefined {
    const value = Number(failure.headers[name]);
    return failure.headers[name] === undefined || Number.isNaN(value) ? undefined : value;
  }

  private readFailure(error: unknown): HttpFailure | undefined {
    if (typeof error !== "object" || error === null || !("status" in error)) return undefined;
    if (typeof error.status !== "number") return undefined;
    const response = "response" in error ? (error.response as Partial<HttpResponse>) : undefined;
    return {
      status: error.status,
      headers: response?.headers ?? {},
      message: this.messageOf(response?.data),
    };
  }

  private messageOf(data: unknown): string {
    if (typeof data !== "object" || data === null || !("message" in data)) return "";
    return String(data.message);
  }
}

interface HttpResponse {
  readonly headers: HttpFailure["headers"];
  readonly data: unknown;
}
