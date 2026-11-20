import { ContainerModule } from "inversify";
import type { IndexFailureLog } from "../../../application/ports/index-failure-log";
import type { NoteCatalog } from "../../../application/ports/note-catalog";
import type { SearchIndex } from "../../../application/ports/search-index";
import { LOGGING } from "../logging/logging.symbols";
import { D1IndexManifest } from "./d1-index-manifest";
import { D1SearchIndex } from "./d1-search-index";
import { D1_SEARCH_SYMBOLS } from "./d1-search.symbols";

export function createD1SearchModule(database: D1Database): ContainerModule {
  return new ContainerModule(({ bind }) => {
    bind<D1Database>(D1_SEARCH_SYMBOLS.Database).toConstantValue(database);
    bind<SearchIndex>(D1_SEARCH_SYMBOLS.SearchIndex)
      .toResolvedValue(
        (db: D1Database, log: IndexFailureLog) => new D1SearchIndex(db, log),
        [D1_SEARCH_SYMBOLS.Database, LOGGING.indexFailureLog],
      )
      .inSingletonScope();
    bind<NoteCatalog>(D1_SEARCH_SYMBOLS.IndexManifest)
      .toResolvedValue(
        (db: D1Database, log: IndexFailureLog) => new D1IndexManifest(db, log),
        [D1_SEARCH_SYMBOLS.Database, LOGGING.indexFailureLog],
      )
      .inSingletonScope();
  });
}
