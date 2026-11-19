import type { Container } from "inversify";
import type { ModulesFactory } from "./app-modules";
import type { ConfigParser } from "./config/env-config-parser";
import { createRootContainer } from "./root.container";

export class Bootstrap {
  private readonly containers = new WeakMap<object, Container>();

  constructor(
    private readonly parser: ConfigParser,
    private readonly buildModules: ModulesFactory,
  ) {}

  start(env: object): Container {
    const container = this.containers.get(env) ?? this.compose(env);
    this.containers.set(env, container);
    return container;
  }

  private compose(env: object): Container {
    const config = this.parser.parse(env);
    return createRootContainer(this.buildModules(config));
  }
}
