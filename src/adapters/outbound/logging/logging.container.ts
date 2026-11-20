import { ContainerModule } from "inversify";
import { ConsoleIndexFailureLog } from "./console-index-failure-log";
import { LOGGING } from "./logging.symbols";

export const loggingModule = new ContainerModule(({ bind }) => {
  bind(LOGGING.indexFailureLog)
    .toResolvedValue(() => new ConsoleIndexFailureLog())
    .inSingletonScope();
});
