import type { CallToolResult, TextContent } from "@modelcontextprotocol/server";
import type { NoteView } from "../../../application/use-cases/note-view";

const NO_NOTES = "No notes found.";
const LINE_BREAK = "\n";
const VERSION_LABEL = "version: ";
const SAVED_LABEL = "Saved ";
const DELETED_LABEL = "Deleted ";

export class ToolResults {
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

  private versionLine(view: NoteView): string {
    return `${VERSION_LABEL}${view.version}`;
  }

  private reply(...texts: string[]): CallToolResult {
    return { content: texts.map((text): TextContent => ({ type: "text", text })) };
  }
}
