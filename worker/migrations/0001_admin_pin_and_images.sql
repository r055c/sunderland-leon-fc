-- Run once on a database created from the first schema (before PIN + image storage existed).
ALTER TABLE club_settings ADD COLUMN admin_pin_hash TEXT;
CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, content_type TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
-- then set the club's PIN hash (see docs/ADD-A-CLUB.md)
