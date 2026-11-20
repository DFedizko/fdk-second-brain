import { ContainerModule } from "inversify";
import type { IndexMessage } from "../../../shared/contracts/index-message";
import { CloudflarePathQueue } from "./cloudflare-path-queue";
import { QUEUE } from "./queue.symbols";

export function createQueueModule(queue: Queue<IndexMessage>): ContainerModule {
    return new ContainerModule(({ bind }) => {
        bind(QUEUE.binding).toConstantValue(queue);
        bind(QUEUE.pathQueue)
            .toResolvedValue((binding: Queue<IndexMessage>) => new CloudflarePathQueue(binding), [QUEUE.binding])
            .inSingletonScope();
    });
}
