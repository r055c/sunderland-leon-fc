-- D1 (SQLite) schema for the club app. Run once on a new database.
CREATE TABLE seasons (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, age_group TEXT, is_active INTEGER DEFAULT 0, competitions TEXT DEFAULT '["Spring Cup"]', placements TEXT NOT NULL DEFAULT '{}', competition_types TEXT NOT NULL DEFAULT '{}');
CREATE TABLE results (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, opposition TEXT, homeScore INTEGER, awayScore INTEGER, scorers TEXT, result TEXT, competition TEXT, motm TEXT, oppMotm TEXT, oppLogo TEXT, season_id INTEGER REFERENCES seasons(id), round TEXT);
CREATE TABLE teams (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, logo TEXT);
CREATE TABLE fixtures (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, rawDate TEXT, opposition TEXT, competition TEXT, venue TEXT, notes TEXT, season_id INTEGER REFERENCES seasons(id));
CREATE TABLE players (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, squad_number INTEGER, photo TEXT, is_active INTEGER DEFAULT 1);
CREATE TABLE appearances (id INTEGER PRIMARY KEY AUTOINCREMENT, player_id INTEGER REFERENCES players(id), result_id INTEGER REFERENCES results(id), season_id INTEGER REFERENCES seasons(id));
CREATE TABLE match_photos (id INTEGER PRIMARY KEY AUTOINCREMENT, result_id INTEGER NOT NULL REFERENCES results(id), url TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE TABLE club_settings (id INTEGER PRIMARY KEY CHECK (id = 1), club_name TEXT NOT NULL DEFAULT 'My Club FC', short_name TEXT NOT NULL DEFAULT 'My Club', slogan TEXT NOT NULL DEFAULT '', primary_color TEXT NOT NULL DEFAULT '#12172e', accent_color TEXT NOT NULL DEFAULT '#5fb2d9', font_pairing TEXT NOT NULL DEFAULT 'classic', badge_url TEXT, updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), admin_pin_hash TEXT, icon_url TEXT);
CREATE TABLE images (id TEXT PRIMARY KEY, content_type TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE INDEX idx_results_season ON results(season_id);
CREATE INDEX idx_app_result ON appearances(result_id);
CREATE INDEX idx_app_player ON appearances(player_id);
CREATE INDEX idx_photos_result ON match_photos(result_id);
-- Starting admin PIN is 0000. Change it in the app (Branding screen) straight away.
INSERT INTO club_settings (id, admin_pin_hash) VALUES (1, 'd673e4127504bb60$63f677ee8cec8f39c3fd9c78f797b1b5d6da51ff8778e8b4cdba41423014c32b');

-- A new club needs one season to start with (the app can't create it before anyone has unlocked admin).
INSERT INTO seasons (name, age_group, is_active, competitions, placements, competition_types) VALUES ('2026/27', '', 1, '[]', '{}', '{}');
