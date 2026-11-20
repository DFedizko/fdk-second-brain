import type {
  IndexFailure,
  IndexFailureLog,
} from "../../../../src/application/ports/index-failure-log";

export class SpyIndexFailureLog implements IndexFailureLog {
  readonly reported: IndexFailure[] = [];

  report(failure: IndexFailure): void {
    this.reported.push(failure);
  }
}
