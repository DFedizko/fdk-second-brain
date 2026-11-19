import { Container } from "inversify";
import type { NoteRepository } from "../../../../src/application/ports/note-repository";
import { githubContainer } from "../../../../src/adapters/outbound/github/github.container";
import { GITHUB } from "../../../../src/adapters/outbound/github/github.symbols";
import { GitHubNoteRepo } from "../../../../src/adapters/outbound/github/github-note-repo";
import { GITHUB_CONFIG } from "./__stub__/github-config";

describe("githubContainer", () => {
  it("binds the NoteRepository port to the GitHub adapter", () => {
    const container = new Container();
    container.load(githubContainer(GITHUB_CONFIG));

    const repository = container.get<NoteRepository>(GITHUB.noteRepository);

    expect(repository).toBeInstanceOf(GitHubNoteRepo);
  });

  it("binds the injected config", () => {
    const container = new Container();
    container.load(githubContainer(GITHUB_CONFIG));

    const config = container.get(GITHUB.config);

    expect(config).toBe(GITHUB_CONFIG);
  });
});
