import { ContainerModule } from "inversify";
import { CLOCK } from "./clock.symbols";
import { SystemClock } from "./system-clock";

export const clockModule = new ContainerModule(({ bind }) => {
    bind(CLOCK.clock)
        .toResolvedValue(() => new SystemClock())
        .inSingletonScope();
});
