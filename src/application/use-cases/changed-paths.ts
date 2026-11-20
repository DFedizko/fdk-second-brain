import type { DeleteNoteInput } from "./delete-note";
import type { ChangedPaths } from "./indexed-change";
import type { MoveNoteInput } from "./move-note";
import type { PathChange } from "./note-index-sync";
import type { NoteView } from "./note-view";

const NONE: readonly string[] = [];

export class SavedNotePaths implements ChangedPaths<unknown, NoteView> {
  of(_input: unknown, saved: NoteView): PathChange {
    return { indexed: [saved.path], removed: NONE };
  }
}

export class MovedNotePaths implements ChangedPaths<MoveNoteInput, NoteView> {
  of(input: MoveNoteInput, moved: NoteView): PathChange {
    return { indexed: [moved.path], removed: [input.from] };
  }
}

export class DeletedNotePaths implements ChangedPaths<DeleteNoteInput, void> {
  of(input: DeleteNoteInput): PathChange {
    return { indexed: NONE, removed: [input.path] };
  }
}
