import type { WorkerBindings } from "../../../src/main/worker-bindings";
import { DUMMY_D1_DATABASE } from "../../__dummy__/dummy-d1-database";
import { VALID_ENV } from "./valid-env";

export const WORKER_ENV = { ...VALID_ENV, DB: DUMMY_D1_DATABASE } satisfies WorkerBindings;
