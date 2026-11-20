export interface IndexFailure {
    readonly path: string;
    readonly error: unknown;
}

export interface IndexFailureLog {
    report(failure: IndexFailure): void;
}
