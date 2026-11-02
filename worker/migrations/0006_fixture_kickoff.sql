-- Fixtures get a kick-off time and home/away, used by the Make poster feature.
ALTER TABLE fixtures ADD COLUMN kickoff_time TEXT;
ALTER TABLE fixtures ADD COLUMN home_away TEXT;
