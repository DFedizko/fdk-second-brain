const WORKERS_MODULE = "cloudflare:workers";

class WorkerEntrypoint {}

export const KEPT_ALIVE: Promise<unknown>[] = [];

function waitUntil(promise: Promise<unknown>): void {
    KEPT_ALIVE.push(promise);
}

Bun.plugin({
    name: "cloudflare-workers-shim",
    setup(build) {
        build.module(WORKERS_MODULE, () => ({
            exports: { WorkerEntrypoint, waitUntil },
            loader: "object",
        }));
    },
});
