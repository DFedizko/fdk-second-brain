import { waitUntil } from "cloudflare:workers";
import { ContainerModule } from "inversify";
import { BACKGROUND } from "./background.symbols";
import { WaitUntilTasks } from "./wait-until-tasks";

// The container outlives a request, so it can't hold one request's ExecutionContext.
// workerd's waitUntil from cloudflare:workers is ctx.waitUntil of the current request.
export const backgroundModule = new ContainerModule(({ bind }) => {
  bind(BACKGROUND.tasks)
    .toResolvedValue(() => new WaitUntilTasks(waitUntil))
    .inSingletonScope();
});
