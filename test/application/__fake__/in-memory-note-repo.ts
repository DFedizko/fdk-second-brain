import type { NoteRepository } from "../../../src/application/ports/note-repository";
import { MovedNote } from "../../../src/domain/moved-note";
import { Note } from "../../../src/domain/note";
import type { NoteFolder } from "../../../src/domain/note-folder";
import { NotePath } from "../../../src/domain/note-path";
import { NoteVersion } from "../../../src/domain/note-version";
import { NoteNotFound } from "../../../src/domain/errors/note-not-found";
import { NoteAlreadyExists } from "../../../src/domain/errors/note-already-exists";

const HASH_ALGORITHM = "sha1";
const HEX = "hex";

export class InMemoryNoteRepo implements NoteRepository {
    private readonly contents = new Map<string, string>();

    async list(folder: NoteFolder): Promise<NotePath[]> {
        return [...this.contents.keys()]
            .sort()
            .map((raw) => NotePath.of(raw))
            .filter((path) => folder.contains(path));
    }

    async read(path: NotePath): Promise<Note> {
        return this.toNote(path, this.contentOf(path));
    }

    async create(path: NotePath, content: string): Promise<Note> {
        this.rejectExisting(path);
        return this.store(path, content);
    }

    async write(path: NotePath, content: string, expected: NoteVersion): Promise<Note> {
        this.toNote(path, this.contentOf(path)).ensureVersion(expected);
        return this.store(path, content);
    }

    async delete(path: NotePath): Promise<void> {
        this.contentOf(path);
        this.contents.delete(path.value);
    }

    async move(from: NotePath, to: NotePath): Promise<MovedNote> {
        const content = this.contentOf(from);
        this.rejectExisting(to);
        this.contents.delete(from.value);
        const moved = this.store(to, content);
        return new MovedNote(moved.path, moved.version, moved.content);
    }

    private contentOf(path: NotePath): string {
        const content = this.contents.get(path.value);
        if (content === undefined) throw new NoteNotFound(path.value);
        return content;
    }

    private rejectExisting(path: NotePath): void {
        if (this.contents.has(path.value)) throw new NoteAlreadyExists(path.value);
    }

    private store(path: NotePath, content: string): Note {
        this.contents.set(path.value, content);
        return this.toNote(path, content);
    }

    private toNote(path: NotePath, content: string): Note {
        return new Note(path, content, this.hash(content));
    }

    private hash(content: string): NoteVersion {
        const bytes = new TextEncoder().encode(content);
        const hasher = new Bun.CryptoHasher(HASH_ALGORITHM);
        hasher.update(`blob ${bytes.length}\0`);
        hasher.update(bytes);
        return NoteVersion.of(hasher.digest(HEX));
    }
}
