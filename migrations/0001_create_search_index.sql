CREATE TABLE note_chunks (
  id INTEGER PRIMARY KEY,
  path TEXT NOT NULL,
  heading TEXT NOT NULL,
  seq INTEGER NOT NULL,
  text TEXT NOT NULL,
  version TEXT NOT NULL,
  UNIQUE (path, seq)
);

CREATE VIRTUAL TABLE note_chunks_fts USING fts5(
  heading,
  text,
  content = 'note_chunks',
  content_rowid = 'id',
  tokenize = 'unicode61 remove_diacritics 2',
  prefix = '2 3'
);

CREATE TRIGGER note_chunks_after_insert AFTER INSERT ON note_chunks BEGIN
  INSERT INTO note_chunks_fts (rowid, heading, text) VALUES (new.id, new.heading, new.text);
END;

CREATE TRIGGER note_chunks_after_delete AFTER DELETE ON note_chunks BEGIN
  INSERT INTO note_chunks_fts (note_chunks_fts, rowid, heading, text)
  VALUES ('delete', old.id, old.heading, old.text);
END;

CREATE TRIGGER note_chunks_after_update AFTER UPDATE ON note_chunks BEGIN
  INSERT INTO note_chunks_fts (note_chunks_fts, rowid, heading, text)
  VALUES ('delete', old.id, old.heading, old.text);
  INSERT INTO note_chunks_fts (rowid, heading, text) VALUES (new.id, new.heading, new.text);
END;

CREATE TABLE index_manifest (
  path TEXT PRIMARY KEY,
  version TEXT NOT NULL
);
