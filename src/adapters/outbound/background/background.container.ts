import { waitUntil } from "cloudflare:workers";
import { ContainerModule } from "inversify";
import { BACKGROUND } from "./background.symbols";
import { WaitUntilTasks } from "./wait-until-tasks";

export const backgroundModule = new ContainerModule(({ bind }) => {
  bind(BACKGROUND.tasks)
    .toResolvedValue(() => new WaitUntilTasks(waitUntil))
    .inSingletonScope();
});
