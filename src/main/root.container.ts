import { Container, type ContainerModule } from "inversify";

export function createRootContainer(modules: readonly ContainerModule[]): Container {
    const container = new Container();
    container.load(...modules);
    return container;
}
