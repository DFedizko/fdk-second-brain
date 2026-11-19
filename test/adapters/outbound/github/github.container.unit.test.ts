import { Container } from "inversify";
import type { NoteRepository } from "../../../../src/application/ports/note-repository";
import { githubContainer } from "../../../../src/adapters/outbound/github/github.container";
import { GITHUB } from "../../../../src/adapters/outbound/github/github.symbols";
import { GitHubNoteRepo } from "../../../../src/adapters/outbound/github/github-note-repo";
import { SILENT_LOG } from "../../../../src/adapters/outbound/github/silent-log";
import { GITHUB_CONFIG } from "./__stub__/github-config";

describe("githubContainer", () => {
  it("binds the NoteRepository port to the GitHub adapter", () => {
    const container = new Container();
    container.load(githubContainer(GITHUB_CONFIG));

    const repository = container.get<NoteRepository>(GITHUB.noteRepository);

    expect(repository).toBeInstanceOf(GitHubNoteRepo);
  });

  it("builds a GitHub client that logs nothing, as request URLs hold note paths", () => {
    const container = new Container();
    container.load(githubContainer(GITHUB_CONFIG));

    const client = container.get(GITHUB.client);

    expect(client.log).toBe(SILENT_LOG);
  });

  it("binds the injected config", () => {
    const container = new Container();
    container.load(githubContainer(GITHUB_CONFIG));

    const config = container.get(GITHUB.config);

    expect(config).toBe(GITHUB_CONFIG);
  });
});
