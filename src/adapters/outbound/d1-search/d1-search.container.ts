import { ContainerModule } from "inversify";
import type { SearchIndex } from "../../../application/ports/search-index";
import { D1SearchIndex } from "./d1-search-index";
import { D1_SEARCH_SYMBOLS } from "./d1-search.symbols";

export function createD1SearchModule(database: D1Database): ContainerModule {
  return new ContainerModule(({ bind }) => {
    bind<D1Database>(D1_SEARCH_SYMBOLS.Database).toConstantValue(database);
    bind<SearchIndex>(D1_SEARCH_SYMBOLS.SearchIndex)
      .toResolvedValue((db: D1Database) => new D1SearchIndex(db), [D1_SEARCH_SYMBOLS.Database])
      .inSingletonScope();
  });
}
