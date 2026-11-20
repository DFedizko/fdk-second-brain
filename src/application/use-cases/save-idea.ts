import { IDEAS_FOLDER, IdeaPath } from "../../domain/idea-path";
import { NoteFolder } from "../../domain/note-folder";
import type { NotePath } from "../../domain/note-path";
import { Slug } from "../../domain/slug";
import type { Clock } from "../ports/clock";
import type { NoteRepository } from "../ports/note-repository";
import { toNoteView, type NoteView } from "./note-view";

const FIRST_ATTEMPT = 1;
const HEADING_PREFIX = "# ";
const PARAGRAPH_BREAK = "\n\n";

export interface SaveIdeaInput {
    readonly title: string;
    readonly content: string;
}

export class SaveIdea {
    constructor(
        private readonly repository: NoteRepository,
        private readonly clock: Clock,
    ) {}

    async execute(input: SaveIdeaInput): Promise<NoteView> {
        const idea = new IdeaPath(this.clock.now(), Slug.from(input.title));
        const taken = await this.listTakenPaths();
        const path = this.findFreePath(idea, taken, FIRST_ATTEMPT);
        return toNoteView(await this.repository.create(path, this.composeContent(input)));
    }

    private async listTakenPaths(): Promise<Set<string>> {
        const paths = await this.repository.list(NoteFolder.of(IDEAS_FOLDER));
        return new Set(paths.map((path) => path.value));
    }

    private findFreePath(idea: IdeaPath, taken: Set<string>, attempt: number): NotePath {
        const path = idea.attempt(attempt);
        return taken.has(path.value) ? this.findFreePath(idea, taken, attempt + 1) : path;
    }

    private composeContent(input: SaveIdeaInput): string {
        return `${HEADING_PREFIX}${input.title}${PARAGRAPH_BREAK}${input.content}`;
    }
}
