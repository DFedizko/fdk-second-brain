import type { NotePath } from "../../domain/note-path";
import type { NoteCatalog, NoteStamp } from "../ports/note-catalog";
import type { NoteTree } from "../ports/note-tree";
import type { PathQueue } from "../ports/path-queue";

export interface ReconcileResult {
    readonly missing: number;
    readonly stale: number;
    readonly orphaned: number;
}

type VersionsByPath = ReadonlyMap<string, string>;

export class ReconcileIndex {
    constructor(
        private readonly notes: NoteTree,
        private readonly index: NoteCatalog,
        private readonly queue: PathQueue,
    ) {}

    async execute(after?: string): Promise<ReconcileResult> {
        const [snapshot, indexed] = await Promise.all([this.notes.snapshot(after), this.index.stamps()]);
        const notes = snapshot.stamps;
        const indexedVersions = this.byPath(indexed);
        const notePaths = this.byPath(notes);
        const missing = notes.filter((note) => !indexedVersions.has(note.path.value));
        const stale = notes.filter((note) => this.isStale(note, indexedVersions));
        const orphaned = indexed.filter((entry) => !notePaths.has(entry.path.value));
        const fixes = [...missing, ...stale, ...orphaned].map((stamp) => stamp.path);
        await this.enqueueFixes(fixes, snapshot.commit);
        return { missing: missing.length, stale: stale.length, orphaned: orphaned.length };
    }

    private byPath(stamps: readonly NoteStamp[]): VersionsByPath {
        return new Map(stamps.map((stamp) => [stamp.path.value, stamp.version.value]));
    }

    private isStale(note: NoteStamp, indexed: VersionsByPath): boolean {
        const version = indexed.get(note.path.value);
        return version !== undefined && version !== note.version.value;
    }

    private async enqueueFixes(paths: readonly NotePath[], commit?: string): Promise<void> {
        if (paths.length > 0) await this.queue.enqueue(paths, commit);
    }
}
