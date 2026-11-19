import { Container } from "inversify";
import type { NoteRepository } from "../../../../src/application/ports/note-repository";
import { githubContainer } from "../../../../src/adapters/outbound/github/github.container";
import { GITHUB } from "../../../../src/adapters/outbound/github/github.symbols";
import { GitHubNoteRepo } from "../../../../src/adapters/outbound/github/github-note-repo";
import { SILENT_LOG } from "../../../../src/adapters/outbound/github/silent-log";
import { clockModule } from "../../../../src/adapters/outbound/clock/clock.container";
import { GITHUB_CONFIG } from "./__stub__/github-config";

const LOCAL_API_URL = "http://127.0.0.1:8787";

describe("githubContainer", () => {
  it("binds the NoteRepository port to the GitHub adapter", () => {
    const container = new Container();
    container.load(githubContainer(GITHUB_CONFIG), clockModule);

    const repository = container.get<NoteRepository>(GITHUB.noteRepository);

    expect(repository).toBeInstanceOf(GitHubNoteRepo);
  });

  it("builds a GitHub client that logs nothing, as request URLs hold note paths", () => {
    const container = new Container();
    container.load(githubContainer(GITHUB_CONFIG), clockModule);

    const client = container.get(GITHUB.client);

    expect(client.log).toBe(SILENT_LOG);
  });

  it("sends requests to the configured API URL", () => {
    const container = new Container();
    container.load(githubContainer({ ...GITHUB_CONFIG, apiUrl: LOCAL_API_URL }));

    const client = container.get(GITHUB.client);

    expect(client.request.endpoint.DEFAULTS.baseUrl).toBe(LOCAL_API_URL);
  });

  it("binds the injected config", () => {
    const container = new Container();
    container.load(githubContainer(GITHUB_CONFIG), clockModule);

    const config = container.get(GITHUB.config);

    expect(config).toBe(GITHUB_CONFIG);
  });
});
