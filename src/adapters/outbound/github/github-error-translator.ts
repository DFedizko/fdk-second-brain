import type { Clock } from "../../../application/ports/clock";
import { NoteAlreadyExists } from "../../../domain/errors/note-already-exists";
import { NoteNotFound } from "../../../domain/errors/note-not-found";
import { NotesAccessDenied } from "../../../domain/errors/notes-access-denied";
import { NotesRateLimited } from "../../../domain/errors/notes-rate-limited";
import { NotesUnavailable } from "../../../domain/errors/notes-unavailable";
import { VersionConflict } from "../../../domain/errors/version-conflict";
import { BranchMoved } from "./branch-moved";
import { EmptyRepository } from "./empty-repository";
import { RefAlreadyExists } from "./ref-already-exists";

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
const REF_EXISTS = /Reference already exists/i;
const EMPTY_REPOSITORY = /Git Repository is empty/i;
const NEWER_VERSION = "a newer version";
const REMAINING_HEADER = "x-ratelimit-remaining";
const RESET_HEADER = "x-ratelimit-reset";
const RETRY_AFTER_HEADER = "retry-after";

export interface FailureContext {
    readonly path?: string;
    readonly expected?: string;
    readonly mayBeMissing?: boolean;
}

export interface GitHubErrorMapper {
    toDomainError(error: unknown, context: FailureContext): Error;
}

interface HttpFailure {
    readonly status: number;
    readonly headers: Readonly<Record<string, string | number | undefined>>;
    readonly message: string;
    readonly cause: unknown;
}

export class GitHubErrorTranslator implements GitHubErrorMapper {
    constructor(private readonly clock: Clock) {}

    toDomainError(error: unknown, context: FailureContext): Error {
        const failure = this.readFailure(error);
        if (!failure) return new NotesUnavailable(undefined, error);
        if (this.isRateLimit(failure)) return this.rateLimited(failure);
        return this.byStatus(failure, context);
    }

    private byStatus(failure: HttpFailure, context: FailureContext): Error {
        switch (failure.status) {
            case UNAUTHORIZED:
            case FORBIDDEN:
                return new NotesAccessDenied(failure.cause);
            case NOT_FOUND:
                return this.notFound(failure, context);
            case CONFLICT:
                if (EMPTY_REPOSITORY.test(failure.message)) return new EmptyRepository();
                return this.conflict(failure, context);
            case UNPROCESSABLE:
                return this.unprocessable(failure, context);
            default:
                return new NotesUnavailable(failure.status, failure.cause);
        }
    }

    private unprocessable(failure: HttpFailure, context: FailureContext): Error {
        if (context.path !== undefined && SHA_MISSING.test(failure.message)) {
            return new NoteAlreadyExists(context.path);
        }
        if (NOT_FAST_FORWARD.test(failure.message)) return new BranchMoved();
        if (REF_EXISTS.test(failure.message)) return new RefAlreadyExists();
        return new NotesUnavailable(failure.status, failure.cause);
    }

    private conflict(failure: HttpFailure, context: FailureContext): Error {
        const { path, expected } = context;
        if (path === undefined || expected === undefined) return new NotesUnavailable(failure.status, failure.cause);
        return new VersionConflict(path, expected, NEWER_VERSION);
    }

    private notFound(failure: HttpFailure, context: FailureContext): Error {
        if (context.path === undefined || !context.mayBeMissing) {
            return new NotesUnavailable(failure.status, failure.cause);
        }
        return new NoteNotFound(context.path);
    }

    private isRateLimit(failure: HttpFailure): boolean {
        if (failure.status === TOO_MANY_REQUESTS) return true;
        if (failure.status !== FORBIDDEN) return false;
        return (
            String(failure.headers[REMAINING_HEADER]) === NO_REQUESTS_LEFT ||
            failure.headers[RETRY_AFTER_HEADER] !== undefined ||
            RATE_LIMIT_MESSAGE.test(failure.message)
        );
    }

    private rateLimited(failure: HttpFailure): NotesRateLimited {
        const retryAfter = this.numberHeader(failure, RETRY_AFTER_HEADER);
        return new NotesRateLimited(this.resetTimeOf(failure, retryAfter), retryAfter, failure.cause);
    }

    private resetTimeOf(failure: HttpFailure, retryAfter?: number): Date | undefined {
        if (retryAfter !== undefined) {
            return new Date(this.clock.now().getTime() + retryAfter * MILLIS_PER_SECOND);
        }
        const reset = this.numberHeader(failure, RESET_HEADER);
        const exhausted = String(failure.headers[REMAINING_HEADER]) === NO_REQUESTS_LEFT;
        return exhausted && reset !== undefined ? new Date(reset * MILLIS_PER_SECOND) : undefined;
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
            cause: error,
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
