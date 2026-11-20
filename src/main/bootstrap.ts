import type { Container } from "inversify";
import type { ModulesFactory } from "./app-modules";
import type { ConfigParser } from "./config/env-config-parser";
import { createRootContainer } from "./root.container";
import type { WorkerBindings } from "./worker-bindings";

export class Bootstrap {
    private readonly containers = new WeakMap<object, Container>();

    constructor(
        private readonly parser: ConfigParser,
        private readonly buildModules: ModulesFactory,
    ) {}

    start(env: WorkerBindings): Container {
        return this.containers.get(env) ?? this.compose(env);
    }

    private compose(env: WorkerBindings): Container {
        const config = this.parser.parse(env);
        const container = createRootContainer(this.buildModules(config, env));
        this.containers.set(env, container);
        return container;
    }
}
