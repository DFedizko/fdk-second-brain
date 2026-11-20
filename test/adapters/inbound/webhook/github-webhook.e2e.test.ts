import { VALID_ENV } from "../../../main/__stub__/valid-env";
import { McpE2eStack } from "../mcp/mcp-e2e-stack";
import { SettledSearch, type HitsCheck } from "../mcp/tools/settled-search";
import { FakeGitHubWebhook } from "./__fake__/fake-github-webhook";
import type { FileChanges } from "./__fake__/push-payload";
import { OutsideEdits } from "./outside-edits";
import { StaleIndexRows } from "./stale-index-rows";

const STARTUP_TIMEOUT_MS = 60_000;
const TEST_TIMEOUT_MS = 30_000;
const QUEUE_SETTLE_TRIES = 500;
const BRANCH = VALID_ENV.NOTES_BRANCH;
const PLAN = "projects/plan.md";
const IDEA = "ideas/idea.md";
const NO_MATCHES = "No notes match the search.";
const ACCEPTED = 202;
const UNAUTHORIZED = 401;
const FORGED_SECRET = "a-forged-secret-of-at-least-32-chars";

let stack: McpE2eStack;
let search: SettledSearch;
let edits: OutsideEdits;
const github = new FakeGitHubWebhook(VALID_ENV.GITHUB_WEBHOOK_SECRET);

beforeAll(async () => {
  stack = await McpE2eStack.start();
  search = new SettledSearch(stack.client);
}, STARTUP_TIMEOUT_MS);

beforeEach(() => {
  edits = new OutsideEdits(stack.seed({}), BRANCH);
});

afterAll(async () => {
  await stack.stop();
});

function noteAbout(word: string): string {
  return `# Note\n\nAll about ${word}.\n`;
}

function hitAt(path: string, word: string): string {
  return `${path} > Note\nAll about ${word}.`;
}

const showsOnly = (hit: string) => (hits: readonly string[]) =>
  hits.length === 1 && hits[0] === hit;

function settle(word: string, settled: HitsCheck): Promise<string[]> {
  return search.until(word, settled, QUEUE_SETTLE_TRIES);
}

function push(...commits: FileChanges[]): Promise<Response> {
  return stack.fetch(github.push({ branch: BRANCH, commits, after: edits.head() }));
}

describe("POST /webhooks/github", () => {
  it(
    "makes a note added on GitHub searchable",
    async () => {
      edits.write(PLAN, noteAbout("andromeda"));

      await push({ added: [PLAN] });

      expect(await settle("andromeda", showsOnly(hitAt(PLAN, "andromeda")))).toEqual([
        hitAt(PLAN, "andromeda"),
      ]);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "drops a note deleted on GitHub from search",
    async () => {
      edits.write(PLAN, noteAbout("betelgeuse"));
      await push({ added: [PLAN] });
      await settle("betelgeuse", showsOnly(hitAt(PLAN, "betelgeuse")));
      edits.delete(PLAN);

      await push({ removed: [PLAN] });

      expect(await settle("betelgeuse", showsOnly(NO_MATCHES))).toEqual([NO_MATCHES]);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "keeps a note written then deleted within moments out of search",
    async () => {
      await stack.client.callTool("write_note", { path: IDEA, content: noteAbout("cassiopeia") });
      await stack.client.callTool("delete_note", { path: IDEA });
      await new StaleIndexRows(await stack.database()).plant(IDEA, "Note", "All about cassiopeia.");

      await push({ added: [IDEA] }, { removed: [IDEA] });

      expect(await settle("cassiopeia", showsOnly(NO_MATCHES))).toEqual([NO_MATCHES]);
    },
    TEST_TIMEOUT_MS,
  );

  it("accepts a signed push to the notes branch", async () => {
    const response = await push({ modified: [PLAN] });

    expect(response.status).toBe(ACCEPTED);
  });

  it("refuses a push signed with another secret", async () => {
    const forged = new FakeGitHubWebhook(FORGED_SECRET);

    const response = await stack.fetch(forged.push({ branch: BRANCH, commits: [] }));

    expect(response.status).toBe(UNAUTHORIZED);
  });
});

describe("daily reconciliation", () => {
  it(
    "indexes a note the webhook never told about",
    async () => {
      edits.write(PLAN, noteAbout("draco"));

      await stack.runDailyCron();

      expect(await settle("draco", showsOnly(hitAt(PLAN, "draco")))).toEqual([
        hitAt(PLAN, "draco"),
      ]);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "removes a deleted note that stayed in search",
    async () => {
      await new StaleIndexRows(await stack.database()).plant(IDEA, "Note", "All about eridani.");

      await stack.runDailyCron();

      expect(await settle("eridani", showsOnly(NO_MATCHES))).toEqual([NO_MATCHES]);
    },
    TEST_TIMEOUT_MS,
  );
});
