import { Container } from "inversify";
import { createD1SearchModule } from "../../../../src/adapters/outbound/d1-search/d1-search.container";
import { D1_SEARCH_SYMBOLS } from "../../../../src/adapters/outbound/d1-search/d1-search.symbols";
import { D1SearchIndex } from "../../../../src/adapters/outbound/d1-search/d1-search-index";
import type { SearchIndex } from "../../../../src/application/ports/search-index";
import { DUMMY_D1_DATABASE } from "./__dummy__/dummy-d1-database";

describe("createD1SearchModule", () => {
  let container: Container;

  beforeEach(async () => {
    container = new Container();
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
});
