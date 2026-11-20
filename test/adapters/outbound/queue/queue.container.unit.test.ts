import { Container } from "inversify";
import { CloudflarePathQueue } from "../../../../src/adapters/outbound/queue/cloudflare-path-queue";
import { createQueueModule } from "../../../../src/adapters/outbound/queue/queue.container";
import { QUEUE } from "../../../../src/adapters/outbound/queue/queue.symbols";
import { DUMMY_QUEUE } from "./__dummy__/dummy-queue";

describe("createQueueModule", () => {
    it("binds the path queue to the Cloudflare queue adapter", () => {
        const container = new Container();
        container.load(createQueueModule(DUMMY_QUEUE));

        const queue = container.get(QUEUE.pathQueue);

        expect(queue).toBeInstanceOf(CloudflarePathQueue);
    });
});
