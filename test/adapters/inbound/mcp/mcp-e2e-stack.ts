import { CALLBACK_PATH } from "../../../../src/shared/contracts/sign-in-paths";
import { FakeGitHubOAuth } from "../../outbound/github-oauth/__fake__/fake-github-oauth";
import { FakeGitHubApi } from "../../outbound/github/__fake__/fake-github-api";
import { FakeGitHubServer } from "../../outbound/github/__fake__/fake-github-server";
import { VALID_ENV } from "../../../main/__stub__/valid-env";
import { LocalWorker } from "../../../shared/adapters/local-worker";
import { BearerEndpoint } from "../oauth/bearer-endpoint";
import { SignInClient, WORKER_ORIGIN } from "../oauth/sign-in-client";
import { McpTestClient } from "./mcp-test-client";

export const OWNER = { login: "octo-cat", id: Number(VALID_ENV.OWNER_GITHUB_ID) };

export type NoteSeed = Readonly<Record<string, string>>;

export class McpE2eStack {
  private constructor(
    private readonly github: FakeGitHubServer,
    private readonly worker: LocalWorker,
    readonly oauth: FakeGitHubOAuth,
    readonly client: McpTestClient,
  ) {}

  static async start(): Promise<McpE2eStack> {
    const oauth = McpE2eStack.buildOAuth();
    const github = FakeGitHubServer.serve(McpE2eStack.buildRepo({}), oauth);
    const worker = await LocalWorker.start({
      ...VALID_ENV,
      GITHUB_API_URL: github.url,
      GITHUB_OAUTH_URL: github.url,
    });
    oauth.signInAs(OWNER);
    const token = await new SignInClient(worker, oauth).accessToken();
    const client = new McpTestClient(new BearerEndpoint(worker, token));
    return new McpE2eStack(github, worker, oauth, client);
  }

  private static buildOAuth(): FakeGitHubOAuth {
    return new FakeGitHubOAuth({
      clientId: VALID_ENV.GITHUB_CLIENT_ID,
      clientSecret: VALID_ENV.GITHUB_CLIENT_SECRET,
      callbackUrl: `${VALID_ENV.PUBLIC_URL}${CALLBACK_PATH}`,
    });
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

  signInClient(): SignInClient {
    return new SignInClient(this.worker, this.oauth);
  }

  anonymousClient(): McpTestClient {
    return new McpTestClient(this.worker);
  }

  clientWith(token: string): McpTestClient {
    return new McpTestClient(new BearerEndpoint(this.worker, token));
  }

  fetch(request: Request): Promise<Response> {
    return this.worker.fetch(request);
  }

  fetchPath(path: string): Promise<Response> {
    return this.worker.fetch(new Request(new URL(path, WORKER_ORIGIN)));
  }

  async stop(): Promise<void> {
    await this.worker.stop();
    await this.github.stop();
  }
}
