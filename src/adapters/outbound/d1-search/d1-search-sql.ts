const SNIPPET_COLUMN = 1;
const SNIPPET_TOKENS = 48;
const HEADING_WEIGHT = 5.0;
const TEXT_WEIGHT = 1.0;
const HOLDS_EXPECTED = "(SELECT version FROM index_manifest WHERE path = ?1) IS ?2";

export const SEARCH_CHUNKS = `
  SELECT c.path AS path, c.heading AS heading,
    snippet(note_chunks_fts, ${SNIPPET_COLUMN}, '', '', '…', ${SNIPPET_TOKENS}) AS snippet
  FROM note_chunks_fts
  JOIN note_chunks AS c ON c.id = note_chunks_fts.rowid
  WHERE note_chunks_fts MATCH ?1
  ORDER BY bm25(note_chunks_fts, ${HEADING_WEIGHT}, ${TEXT_WEIGHT})
  LIMIT ?2`;

export const SELECT_VERSION = "SELECT version FROM index_manifest WHERE path = ?1";

export const DELETE_CHUNKS = `DELETE FROM note_chunks WHERE path = ?1 AND ${HOLDS_EXPECTED}`;

export const INSERT_CHUNK = `
  INSERT INTO note_chunks (path, heading, seq, text, version)
  SELECT ?1, ?3, ?4, ?5, ?6 WHERE ${HOLDS_EXPECTED}`;

export const UPSERT_VERSION = `
  INSERT INTO index_manifest (path, version) SELECT ?1, ?3 WHERE ${HOLDS_EXPECTED}
  ON CONFLICT (path) DO UPDATE SET version = excluded.version`;

export const DELETE_VERSION = `DELETE FROM index_manifest WHERE path = ?1 AND ${HOLDS_EXPECTED}`;
