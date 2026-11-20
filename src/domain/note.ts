import { VersionConflict } from "./errors/version-conflict";
import type { NotePath } from "./note-path";
import type { NoteVersion } from "./note-version";

export class Note {
    constructor(
        readonly path: NotePath,
        readonly content: string,
        readonly version: NoteVersion,
    ) {}

    ensureVersion(expected: NoteVersion): void {
        if (!this.version.equals(expected)) {
            throw new VersionConflict(this.path.value, expected.value, this.version.value);
        }
    }
}
