import type { CallToolResult, TextContent } from "@modelcontextprotocol/server";
import type { NoteView } from "../../../application/use-cases/note-view";
import type { SearchResult } from "../../../application/use-cases/search-notes";

const NO_NOTES = "No notes found.";
const NO_MATCHES = "No notes match the search.";
const HEADING_MARK = " > ";
const NO_HEADING = "";
const LINE_BREAK = "\n";
const VERSION_LABEL = "version: ";
const SAVED_LABEL = "Saved ";
const DELETED_LABEL = "Deleted ";

export interface ToolReplies {
  paths(paths: readonly string[]): CallToolResult;
  note(view: NoteView): CallToolResult;
  saved(view: NoteView): CallToolResult;
  deleted(path: string): CallToolResult;
  hits(results: readonly SearchResult[]): CallToolResult;
}

export class ToolResults implements ToolReplies {
  paths(paths: readonly string[]): CallToolResult {
    return this.reply(paths.length === 0 ? NO_NOTES : paths.join(LINE_BREAK));
  }

  note(view: NoteView): CallToolResult {
    return this.reply(view.content, this.versionLine(view));
  }

  saved(view: NoteView): CallToolResult {
    return this.reply(`${SAVED_LABEL}${view.path}${LINE_BREAK}${this.versionLine(view)}`);
  }

  deleted(path: string): CallToolResult {
    return this.reply(`${DELETED_LABEL}${path}`);
  }

  hits(results: readonly SearchResult[]): CallToolResult {
    if (results.length === 0) return this.reply(NO_MATCHES);
    return this.reply(...results.map((hit) => this.describeHit(hit)));
  }

  private describeHit(hit: SearchResult): string {
    const place =
      hit.heading === NO_HEADING ? hit.path : `${hit.path}${HEADING_MARK}${hit.heading}`;
    return `${place}${LINE_BREAK}${hit.snippet}`;
  }

  private versionLine(view: NoteView): string {
    return `${VERSION_LABEL}${view.version}`;
  }

  private reply(...texts: string[]): CallToolResult {
    return { content: texts.map((text): TextContent => ({ type: "text", text })) };
  }
}
