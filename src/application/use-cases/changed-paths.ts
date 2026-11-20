import type { DeleteNoteInput } from "./delete-note";
import type { ChangedPaths } from "./indexed-change";
import type { MoveNoteInput } from "./move-note";
import type { PathChange } from "./note-index-sync";
import type { MovedNoteView, NoteView } from "./note-view";

const NO_PATHS: readonly string[] = [];
const NO_NOTES: readonly NoteView[] = [];

export class SavedNotePaths implements ChangedPaths<unknown, NoteView> {
  of(_input: unknown, saved: NoteView): PathChange {
    return { indexed: [saved], removed: NO_PATHS };
  }
}

export class MovedNotePaths implements ChangedPaths<MoveNoteInput, MovedNoteView> {
  of(input: MoveNoteInput, moved: MovedNoteView): PathChange {
    return { indexed: this.indexableOf(moved), removed: [input.from] };
  }

  private indexableOf({ path, content, version }: MovedNoteView): readonly NoteView[] {
    return content === undefined ? NO_NOTES : [{ path, content, version }];
  }
}

export class DeletedNotePaths implements ChangedPaths<DeleteNoteInput, void> {
  of(input: DeleteNoteInput): PathChange {
    return { indexed: NO_NOTES, removed: [input.path] };
  }
}
