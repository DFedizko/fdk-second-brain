import type { ServiceIdentifier } from "inversify";
import type { IndexFailureLog } from "../../../application/ports/index-failure-log";

export const LOGGING = {
  indexFailureLog: Symbol.for("IndexFailureLog") as ServiceIdentifier<IndexFailureLog>,
} as const;
