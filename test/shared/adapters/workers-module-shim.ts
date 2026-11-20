const WORKERS_MODULE = "cloudflare:workers";

class WorkerEntrypoint {}

function waitUntil(_promise: Promise<unknown>): void {}

Bun.plugin({
  name: "cloudflare-workers-shim",
  setup(build) {
    build.module(WORKERS_MODULE, () => ({
      exports: { WorkerEntrypoint, waitUntil },
      loader: "object",
    }));
  },
});
