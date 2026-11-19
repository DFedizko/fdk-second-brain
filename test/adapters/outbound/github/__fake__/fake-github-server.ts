import type { FakeGitHubOAuth } from "../../github-oauth/__fake__/fake-github-oauth";
import type { FakeGitHubApi } from "./fake-github-api";

const LOOPBACK = "127.0.0.1";
const ANY_FREE_PORT = 0;

export class FakeGitHubServer {
  private constructor(
    private readonly server: Bun.Server<undefined>,
    private readonly backend: { api: FakeGitHubApi },
  ) {}

  static serve(api: FakeGitHubApi, oauth?: FakeGitHubOAuth): FakeGitHubServer {
    const backend = { api };
    const server = Bun.serve({
      hostname: LOOPBACK,
      port: ANY_FREE_PORT,
      fetch: (request) =>
        oauth?.handles(new URL(request.url)) ? oauth.fetch(request) : backend.api.fetch(request),
    });
    return new FakeGitHubServer(server, backend);
  }

  get url(): string {
    return `http://${LOOPBACK}:${this.server.port}`;
  }

  use(api: FakeGitHubApi): void {
    this.backend.api = api;
  }

  async stop(): Promise<void> {
    await this.server.stop(true);
  }
}
