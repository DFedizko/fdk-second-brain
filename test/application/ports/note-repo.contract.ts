import type { NoteRepository } from "../../../src/application/ports/note-repository";
import { NoteFolder } from "../../../src/domain/note-folder";
import { NotePath } from "../../../src/domain/note-path";
import { NoteVersion } from "../../../src/domain/note-version";
import { NoteNotFound } from "../../../src/domain/errors/note-not-found";
import { NoteAlreadyExists } from "../../../src/domain/errors/note-already-exists";
import { VersionConflict } from "../../../src/domain/errors/version-conflict";

const INBOX = NotePath.of("inbox.md");
const PLAN = NotePath.of("projects/plan.md");
const IDEA = NotePath.of("ideas/2026-11-19-garden.md");
const CONTENT = "# Inbox\n\n- call Ana\n";
const NEW_CONTENT = "# Inbox\n\n- call Ana\n- buy milk\n";
const STALE = NoteVersion.of("stale");

export function describeNoteRepository(name: string, build: () => NoteRepository): void {
    describe(`${name} honours the NoteRepository contract`, () => {
        let repository: NoteRepository;

        beforeEach(() => {
            repository = build();
        });

        it("lists nothing when empty", async () => {
            const paths = await repository.list(NoteFolder.of(""));

            expect(paths).toEqual([]);
        });

        it("lists every note sorted by path from the root", async () => {
            await Promise.all([PLAN, INBOX, IDEA].map((path) => repository.create(path, CONTENT)));

            const paths = await repository.list(NoteFolder.of(""));

            expect(paths.map((path) => path.value)).toEqual([IDEA.value, INBOX.value, PLAN.value]);
        });

        it("lists only the notes inside a folder", async () => {
            await Promise.all([PLAN, INBOX, IDEA].map((path) => repository.create(path, CONTENT)));

            const paths = await repository.list(NoteFolder.of("projects"));

            expect(paths.map((path) => path.value)).toEqual([PLAN.value]);
        });

        it("reads a created note", async () => {
            const created = await repository.create(INBOX, CONTENT);

            const note = await repository.read(INBOX);

            expect(note).toEqual(created);
        });

        it("rejects reading a missing note", async () => {
            const read = repository.read(INBOX);

            await expect(read).rejects.toThrow(NoteNotFound);
        });

        it("gives the same version to the same content", async () => {
            const first = await repository.create(INBOX, CONTENT);

            const second = await repository.create(PLAN, CONTENT);

            expect(second.version).toEqual(first.version);
        });

        it("rejects creating a note that exists", async () => {
            await repository.create(INBOX, CONTENT);

            const create = repository.create(INBOX, NEW_CONTENT);

            await expect(create).rejects.toThrow(NoteAlreadyExists);
        });

        it("overwrites a note when the expected version matches", async () => {
            const created = await repository.create(INBOX, CONTENT);
            await repository.write(INBOX, NEW_CONTENT, created.version);

            const note = await repository.read(INBOX);

            expect(note.content).toBe(NEW_CONTENT);
        });

        it("changes the version when the content changes", async () => {
            const created = await repository.create(INBOX, CONTENT);

            const written = await repository.write(INBOX, NEW_CONTENT, created.version);

            expect(written.version).not.toEqual(created.version);
        });

        it("rejects overwriting with a stale version", async () => {
            await repository.create(INBOX, CONTENT);

            const write = repository.write(INBOX, NEW_CONTENT, STALE);

            await expect(write).rejects.toThrow(VersionConflict);
        });

        it("keeps the content after a rejected overwrite", async () => {
            await repository.create(INBOX, CONTENT);
            await repository.write(INBOX, NEW_CONTENT, STALE).catch(() => undefined);

            const note = await repository.read(INBOX);

            expect(note.content).toBe(CONTENT);
        });

        it("rejects overwriting a missing note", async () => {
            const write = repository.write(INBOX, NEW_CONTENT, STALE);

            await expect(write).rejects.toThrow(NoteNotFound);
        });

        it("deletes a note", async () => {
            await repository.create(INBOX, CONTENT);
            await repository.delete(INBOX);

            const read = repository.read(INBOX);

            await expect(read).rejects.toThrow(NoteNotFound);
        });

        it("rejects deleting a missing note", async () => {
            const remove = repository.delete(INBOX);

            await expect(remove).rejects.toThrow(NoteNotFound);
        });

        it("moves a note with its content", async () => {
            await repository.create(INBOX, CONTENT);
            await repository.move(INBOX, PLAN);

            const note = await repository.read(PLAN);

            expect(note.content).toBe(CONTENT);
        });

        it("removes the note from its old path when moving", async () => {
            await repository.create(INBOX, CONTENT);
            await repository.move(INBOX, PLAN);

            const read = repository.read(INBOX);

            await expect(read).rejects.toThrow(NoteNotFound);
        });

        it("rejects moving a missing note", async () => {
            const move = repository.move(INBOX, PLAN);

            await expect(move).rejects.toThrow(NoteNotFound);
        });

        it("rejects moving onto a note that exists", async () => {
            await Promise.all([INBOX, PLAN].map((path) => repository.create(path, CONTENT)));

            const move = repository.move(INBOX, PLAN);

            await expect(move).rejects.toThrow(NoteAlreadyExists);
        });
    });
}
