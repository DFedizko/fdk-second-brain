import type { WorkerBindings } from "../../../src/main/worker-bindings";
import { DUMMY_D1_DATABASE } from "../../__dummy__/dummy-d1-database";
import { DUMMY_QUEUE } from "../../adapters/outbound/queue/__dummy__/dummy-queue";
import { VALID_ENV } from "./valid-env";

export const WORKER_ENV = {
  ...VALID_ENV,
  DB: DUMMY_D1_DATABASE,
  INDEX_QUEUE: DUMMY_QUEUE,
} satisfies WorkerBindings;
