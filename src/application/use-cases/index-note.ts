import type { MarkdownChunker } from "../../domain/markdown-chunker";
import { NotePath } from "../../domain/note-path";
import { NoteVersion } from "../../domain/note-version";
import type { SearchIndex } from "../ports/search-index";

export interface IndexNoteInput {
  readonly path: string;
  readonly content: string;
  readonly version: string;
}

export type IndexStatus = "indexed" | "unchanged";

export interface IndexNoteResult {
  readonly path: string;
  readonly status: IndexStatus;
}

export class IndexNote {
  constructor(
    private readonly index: SearchIndex,
    private readonly chunker: MarkdownChunker,
  ) {}

  async execute(input: IndexNoteInput): Promise<IndexNoteResult> {
    const path = NotePath.of(input.path);
    const version = NoteVersion.of(input.version);
    const indexed = await this.index.versionOf(path);
    if (indexed?.equals(version)) return { path: path.value, status: "unchanged" };
    await this.index.replace(path, version, this.chunker.chunk(input.content));
    return { path: path.value, status: "indexed" };
  }
}
