-- Live match scoring: one row while a game is being scored, goal minutes on saved results, and a "played" flag on fixtures.
CREATE TABLE IF NOT EXISTS live_match (id INTEGER PRIMARY KEY AUTOINCREMENT, fixture_id INTEGER, season_id INTEGER, opposition TEXT NOT NULL, competition TEXT, home_away TEXT, venue TEXT, squad TEXT NOT NULL DEFAULT '[]', goals TEXT NOT NULL DEFAULT '[]', phase TEXT NOT NULL DEFAULT 'h1', base_ms INTEGER NOT NULL DEFAULT 0, run_since INTEGER, started_at INTEGER);
ALTER TABLE results ADD COLUMN goal_times TEXT;
ALTER TABLE fixtures ADD COLUMN played INTEGER NOT NULL DEFAULT 0;
