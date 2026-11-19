import { ContainerModule } from "inversify";
import { createRootContainer } from "../../src/main/root.container";

const FIRST = Symbol.for("First");
const SECOND = Symbol.for("Second");
const FIRST_VALUE = "first";
const SECOND_VALUE = "second";

function moduleBinding(id: symbol, value: string): ContainerModule {
  return new ContainerModule(({ bind }) => {
    bind<string>(id).toConstantValue(value);
  });
}

describe("createRootContainer", () => {
  it("loads every module it is given", () => {
    const modules = [moduleBinding(FIRST, FIRST_VALUE), moduleBinding(SECOND, SECOND_VALUE)];

    const container = createRootContainer(modules);

    expect([container.get(FIRST), container.get(SECOND)]).toEqual([FIRST_VALUE, SECOND_VALUE]);
  });
});
