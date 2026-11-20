import { SearchNotesTool } from "../../../../../src/adapters/inbound/mcp/tools/search-notes-tool";
import {
  MAX_SEARCH_LIMIT,
  type SearchNotesInput,
  type SearchResult,
} from "../../../../../src/application/use-cases/search-notes";
import { SpyUseCase } from "./__spy__/spy-use-case";
import { InProcessTool } from "./in-process-tool";
import { EMPTY, newReplies, newRunner, NOT_A_STRING, PATH, textOfLength } from "./tool-kit";

const NAME = "search_notes";
const QUERY = "ship plan";
const WANTED_LIMIT = 3;
const BELOW_MIN_LIMIT = 0;
const FRACTIONAL_LIMIT = 2.5;
const MAX_QUERY_LENGTH = 500;
const HIT: SearchResult = { path: PATH, heading: "Plan", snippet: "Ship it." };

let useCase: SpyUseCase<SearchNotesInput, SearchResult[]>;
let tool: InProcessTool;

beforeEach(async () => {
  useCase = new SpyUseCase([HIT]);
  tool = await InProcessTool.connect(new SearchNotesTool(newRunner(), newReplies(), useCase), NAME);
});

describe("search_notes tool", () => {
  it("passes the query and limit to the use case", async () => {
    await tool.call({ query: QUERY, limit: WANTED_LIMIT });

    expect(useCase.inputs).toEqual([{ query: QUERY, limit: WANTED_LIMIT }]);
  });

  it("shows each hit with its path, heading and snippet", async () => {
    const result = await tool.call({ query: QUERY });

    expect(result.content).toEqual([{ type: "text", text: `${PATH} > Plan\nShip it.` }]);
  });

  it("declares limit as optional", async () => {
    const definition = await tool.definition();

    expect(definition?.inputSchema.required).toEqual(["query"]);
  });

  it("marks the tool as read-only", async () => {
    const definition = await tool.definition();

    expect(definition?.annotations?.readOnlyHint).toBe(true);
  });

  it.each([
    ["an empty query", { query: EMPTY }],
    ["a query that is not a string", { query: NOT_A_STRING }],
    ["a query longer than allowed", { query: textOfLength(MAX_QUERY_LENGTH + 1) }],
    ["a limit below one", { query: QUERY, limit: BELOW_MIN_LIMIT }],
    ["a limit above the maximum", { query: QUERY, limit: MAX_SEARCH_LIMIT + 1 }],
    ["a limit that is not whole", { query: QUERY, limit: FRACTIONAL_LIMIT }],
  ])("rejects %s", async (_case, input) => {
    const result = await tool.call(input);

    expect({ isError: result.isError, inputs: useCase.inputs }).toEqual({
      isError: true,
      inputs: [],
    });
  });
});
