-- YouTube links attached to a match. Only the 11-character video id is stored.
CREATE TABLE IF NOT EXISTS match_videos (id INTEGER PRIMARY KEY AUTOINCREMENT, result_id INTEGER NOT NULL REFERENCES results(id), video_id TEXT NOT NULL, title TEXT, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE INDEX IF NOT EXISTS idx_videos_result ON match_videos(result_id);
