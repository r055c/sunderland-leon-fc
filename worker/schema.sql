-- D1 (SQLite) schema for the club app. Run once on a new database.
CREATE TABLE seasons (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, age_group TEXT, is_active INTEGER DEFAULT 0, competitions TEXT DEFAULT '["Spring Cup"]', placements TEXT NOT NULL DEFAULT '{}', competition_types TEXT NOT NULL DEFAULT '{}');
CREATE TABLE results (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, opposition TEXT, homeScore INTEGER, awayScore INTEGER, scorers TEXT, result TEXT, competition TEXT, motm TEXT, oppMotm TEXT, oppLogo TEXT, season_id INTEGER REFERENCES seasons(id), round TEXT);
CREATE TABLE teams (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, logo TEXT);
CREATE TABLE fixtures (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, rawDate TEXT, opposition TEXT, competition TEXT, venue TEXT, notes TEXT, season_id INTEGER REFERENCES seasons(id));
CREATE TABLE players (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, squad_number INTEGER, photo TEXT, is_active INTEGER DEFAULT 1);
CREATE TABLE appearances (id INTEGER PRIMARY KEY AUTOINCREMENT, player_id INTEGER REFERENCES players(id), result_id INTEGER REFERENCES results(id), season_id INTEGER REFERENCES seasons(id));
CREATE TABLE match_photos (id INTEGER PRIMARY KEY AUTOINCREMENT, result_id INTEGER NOT NULL REFERENCES results(id), url TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE TABLE club_settings (id INTEGER PRIMARY KEY CHECK (id = 1), club_name TEXT NOT NULL DEFAULT 'My Club FC', short_name TEXT NOT NULL DEFAULT 'My Club', slogan TEXT NOT NULL DEFAULT '', primary_color TEXT NOT NULL DEFAULT '#12172e', accent_color TEXT NOT NULL DEFAULT '#5fb2d9', font_pairing TEXT NOT NULL DEFAULT 'classic', badge_url TEXT, updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE INDEX idx_results_season ON results(season_id);
CREATE INDEX idx_app_result ON appearances(result_id);
CREATE INDEX idx_app_player ON appearances(player_id);
CREATE INDEX idx_photos_result ON match_photos(result_id);
INSERT INTO club_settings (id) VALUES (1);
