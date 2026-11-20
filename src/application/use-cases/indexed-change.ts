import type { IndexSync, PathChange } from "./note-index-sync";

export interface NoteChange<Input, Output> {
  execute(input: Input): Promise<Output>;
}

export interface ChangedPaths<Input, Output> {
  of(input: Input, output: Output): PathChange;
}

export class IndexedChange<Input, Output> implements NoteChange<Input, Output> {
  constructor(
    private readonly change: NoteChange<Input, Output>,
    private readonly paths: ChangedPaths<Input, Output>,
    private readonly sync: IndexSync,
  ) {}

  async execute(input: Input): Promise<Output> {
    const output = await this.change.execute(input);
    await this.sync.apply(this.paths.of(input, output));
    return output;
  }
}
