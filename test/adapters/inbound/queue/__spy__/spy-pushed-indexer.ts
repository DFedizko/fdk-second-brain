import type { IndexNoteResult } from "../../../../../src/application/use-cases/index-note";
import type { PushedNoteIndexer, PushedNoteInput } from "../../../../../src/application/use-cases/index-pushed-note";

const STATUS = "indexed";

export class SpyPushedIndexer implements PushedNoteIndexer {
    readonly inputs: PushedNoteInput[] = [];

    async execute(input: PushedNoteInput): Promise<IndexNoteResult> {
        this.inputs.push(input);
        return { path: input.path, status: STATUS };
    }
}
