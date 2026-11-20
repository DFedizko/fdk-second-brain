import type { ServiceIdentifier } from "inversify";
import type { BackgroundTasks } from "../../../application/ports/background-tasks";

export const BACKGROUND = {
    tasks: Symbol.for("BackgroundTasks") as ServiceIdentifier<BackgroundTasks>,
} as const;
