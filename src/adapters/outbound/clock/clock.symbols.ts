import type { ServiceIdentifier } from "inversify";
import type { Clock } from "../../../application/ports/clock";

export const CLOCK = {
    clock: Symbol.for("Clock") as ServiceIdentifier<Clock>,
} as const;
