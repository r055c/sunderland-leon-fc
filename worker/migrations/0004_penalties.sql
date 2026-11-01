-- Penalty shoot-outs. homePens/awayPens are the shoot-out score (NULL when there wasn't one); penScorers is a JSON array of our players who scored in it.
ALTER TABLE results ADD COLUMN homePens INTEGER;
ALTER TABLE results ADD COLUMN awayPens INTEGER;
ALTER TABLE results ADD COLUMN penScorers TEXT;
