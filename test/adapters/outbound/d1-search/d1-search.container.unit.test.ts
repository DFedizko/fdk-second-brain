import { Container } from "inversify";
import { createD1SearchModule } from "../../../../src/adapters/outbound/d1-search/d1-search.container";
import { D1_SEARCH_SYMBOLS } from "../../../../src/adapters/outbound/d1-search/d1-search.symbols";
import { D1SearchIndex } from "../../../../src/adapters/outbound/d1-search/d1-search-index";
import { D1IndexManifest } from "../../../../src/adapters/outbound/d1-search/d1-index-manifest";
import type { SearchIndex } from "../../../../src/application/ports/search-index";
import { LOGGING } from "../../../../src/adapters/outbound/logging/logging.symbols";
import { SpyIndexFailureLog } from "../../../__spy__/spy-index-failure-log";
import { DUMMY_D1_DATABASE } from "../../../__dummy__/dummy-d1-database";

describe("createD1SearchModule", () => {
  let container: Container;

  beforeEach(async () => {
    container = new Container();
    container.bind(LOGGING.indexFailureLog).toConstantValue(new SpyIndexFailureLog());
    await container.load(createD1SearchModule(DUMMY_D1_DATABASE));
  });

  it("binds the search index to the D1 adapter", () => {
    const index = container.get<SearchIndex>(D1_SEARCH_SYMBOLS.SearchIndex);

    expect(index).toBeInstanceOf(D1SearchIndex);
  });

  it("binds the search index as a single instance", () => {
    const first = container.get<SearchIndex>(D1_SEARCH_SYMBOLS.SearchIndex);

    const second = container.get<SearchIndex>(D1_SEARCH_SYMBOLS.SearchIndex);

    expect(second).toBe(first);
  });

  it("binds the index manifest to the D1 adapter", () => {
    const manifest = container.get(D1_SEARCH_SYMBOLS.IndexManifest);

    expect(manifest).toBeInstanceOf(D1IndexManifest);
  });
});
