const WORKERS_MODULE = "cloudflare:workers";

class WorkerEntrypoint {}

Bun.plugin({
  name: "cloudflare-workers-shim",
  setup(build) {
    build.module(WORKERS_MODULE, () => ({ exports: { WorkerEntrypoint }, loader: "object" }));
  },
});
