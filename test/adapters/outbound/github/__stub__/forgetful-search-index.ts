import type { SearchHit, SearchIndex } from "../../../../../src/application/ports/search-index";
import type { NoteVersion } from "../../../../../src/domain/note-version";

export class ForgetfulSearchIndex implements SearchIndex {
    async search(): Promise<SearchHit[]> {
        return [];
    }

    async versionOf(): Promise<NoteVersion | null> {
        return null;
    }

    async replace(): Promise<boolean> {
        return true;
    }

    async remove(): Promise<boolean> {
        return true;
    }
}
