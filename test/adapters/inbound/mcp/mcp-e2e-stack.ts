import { FakeGitHubApi } from "../../outbound/github/__fake__/fake-github-api";
import { FakeGitHubServer } from "../../outbound/github/__fake__/fake-github-server";
import { VALID_ENV } from "../../../main/__stub__/valid-env";
import { LocalWorker } from "../../../shared/adapters/local-worker";
import { McpTestClient } from "./mcp-test-client";

const ORIGIN = "https://second-brain.example";

export type NoteSeed = Readonly<Record<string, string>>;

export class McpE2eStack {
  private constructor(
    private readonly github: FakeGitHubServer,
    private readonly worker: LocalWorker,
    readonly client: McpTestClient,
  ) {}

  static async start(): Promise<McpE2eStack> {
    const github = FakeGitHubServer.serve(McpE2eStack.buildRepo({}));
    const worker = await LocalWorker.start({ ...VALID_ENV, GITHUB_API_URL: github.url });
    return new McpE2eStack(github, worker, new McpTestClient(worker));
  }

  private static buildRepo(seed: NoteSeed): FakeGitHubApi {
    return new FakeGitHubApi({
      owner: VALID_ENV.NOTES_REPO_OWNER,
      repo: VALID_ENV.NOTES_REPO_NAME,
      token: VALID_ENV.GITHUB_TOKEN,
      branches: [VALID_ENV.NOTES_BRANCH],
      seed,
    });
  }

  seed(notes: NoteSeed): FakeGitHubApi {
    const repo = McpE2eStack.buildRepo(notes);
    this.github.use(repo);
    return repo;
  }

  fetchPath(path: string): Promise<Response> {
    return this.worker.fetch(new Request(new URL(path, ORIGIN)));
  }

  async stop(): Promise<void> {
    await this.worker.stop();
    await this.github.stop();
  }
}
