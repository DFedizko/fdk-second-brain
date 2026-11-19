import { MarkdownOutline } from "../../domain/markdown-outline";
import { NotePath } from "../../domain/note-path";
import type { NoteRepository } from "../ports/note-repository";

export interface ReadSectionInput {
  readonly path: string;
  readonly heading: string;
}

export interface SectionView {
  readonly path: string;
  readonly heading: string;
  readonly content: string;
  readonly version: string;
}

export class ReadSection {
  constructor(private readonly repository: NoteRepository) {}

  async execute(input: ReadSectionInput): Promise<SectionView> {
    const note = await this.repository.read(NotePath.of(input.path));
    return {
      path: note.path.value,
      heading: input.heading,
      content: new MarkdownOutline(note.content).section(input.heading),
      version: note.version.value,
    };
  }
}
