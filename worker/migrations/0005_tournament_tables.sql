-- League table for a tournament day: the other teams' W/D/L/F/A (JSON) and/or a photo of the organiser's table.
CREATE TABLE IF NOT EXISTS tournament_tables (id INTEGER PRIMARY KEY AUTOINCREMENT, season_id INTEGER REFERENCES seasons(id), competition TEXT NOT NULL, date TEXT NOT NULL, rows TEXT, photo TEXT, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE INDEX IF NOT EXISTS idx_tt_comp ON tournament_tables(competition, date);
