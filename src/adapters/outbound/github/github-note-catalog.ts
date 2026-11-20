import type { NoteStamp } from "../../../application/ports/note-catalog";
import type { NoteSnapshot, NoteTree } from "../../../application/ports/note-tree";
import { BranchBehind } from "../../../domain/errors/branch-behind";
import { InvalidPath } from "../../../domain/errors/invalid-path";
import { NotesUnavailable } from "../../../domain/errors/notes-unavailable";
import { NotePath } from "../../../domain/note-path";
import { NoteVersion } from "../../../domain/note-version";
import { EmptyRepository } from "./empty-repository";
import type { CommitHistory } from "./commit-compare";
import type { FailureContext } from "./github-error-translator";
import type { GitHubAccess } from "./github-gateway";
import type { NoteReader } from "./github-note-reader";
import type { RetryPause } from "./retry-pause";

const BLOB = "blob";
const RECURSIVE = "1";
const NOTE_EXTENSION = ".md";
const BRANCH_LEVEL: FailureContext = {};
const EMPTY_SNAPSHOT: NoteSnapshot = { stamps: [] };
const MAX_HEAD_CHECKS = 3;
const HEAD_CHECK_PAUSE_MILLIS = 1000;

interface TreeEntry {
    readonly path: string;
    readonly type: string;
    readonly sha: string;
}

export class GitHubNoteCatalog implements NoteTree {
    constructor(
        private readonly github: GitHubAccess,
        private readonly reader: NoteReader,
        private readonly history: CommitHistory,
        private readonly pause: RetryPause,
    ) {}

    async snapshot(after?: string): Promise<NoteSnapshot> {
        return this.readSnapshot(after).catch((error: unknown) => {
            if (error instanceof EmptyRepository) return EMPTY_SNAPSHOT;
            throw error;
        });
    }

    private async readSnapshot(after?: string): Promise<NoteSnapshot> {
        const commit = await this.headIncluding(after, MAX_HEAD_CHECKS);
        const entries = await this.treeEntries(commit);
        const stamps = entries
            .filter((entry) => entry.type === BLOB && entry.path.endsWith(NOTE_EXTENSION))
            .flatMap((entry) => this.toStamp(entry));
        return { commit, stamps };
    }

    private async headIncluding(after: string | undefined, checks: number): Promise<string> {
        const head = await this.reader.headCommit();
        if (after === undefined || (await this.history.includes(head, after))) return head;
        if (checks <= 1) throw new BranchBehind(after);
        await this.pause.wait(HEAD_CHECK_PAUSE_MILLIS);
        return this.headIncluding(after, checks - 1);
    }

    private async treeEntries(commit: string): Promise<TreeEntry[]> {
        const { data } = await this.github.send(BRANCH_LEVEL, (client, repo) =>
            client.rest.git.getTree({ ...repo, tree_sha: commit, recursive: RECURSIVE }),
        );
        if (data.truncated) throw new NotesUnavailable();
        return data.tree.map((entry) => ({
            path: entry.path ?? "",
            type: entry.type ?? "",
            sha: entry.sha ?? "",
        }));
    }

    private toStamp(entry: TreeEntry): NoteStamp[] {
        try {
            return [{ path: NotePath.of(entry.path), version: NoteVersion.of(entry.sha) }];
        } catch (error) {
            if (error instanceof InvalidPath) return [];
            throw error;
        }
    }
}
