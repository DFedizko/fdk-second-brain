import { SearchQuery } from "../../src/domain/search-query";
import { EmptySearchQuery } from "../../src/domain/errors/empty-search-query";

describe("SearchQuery", () => {
  it("keeps the words of the query, accents included", () => {
    const query = SearchQuery.of("Decisão sobre o banco");

    expect(query.terms).toEqual(["Decisão", "sobre", "o", "banco"]);
  });

  it("drops punctuation and operators between words", () => {
    const query = SearchQuery.of('  "deploy" AND (cloud-flare)* ^queue: ');

    expect(query.terms).toEqual(["deploy", "AND", "cloud", "flare", "queue"]);
  });

  it("keeps numbers as words", () => {
    const query = SearchQuery.of("plan 2026");

    expect(query.terms).toEqual(["plan", "2026"]);
  });

  it("rejects a query with no words", () => {
    const parse = () => SearchQuery.of(" -- ?! ");

    expect(parse).toThrow(EmptySearchQuery);
  });
});
