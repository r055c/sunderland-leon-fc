# Sunderland Leon FC — PWA with Seasons

## Step 1 — Supabase SQL

Run this in your Supabase SQL editor. If you already have results/teams/fixtures tables, only run the NEW parts marked below.

```sql
-- EXISTING (skip if already run)
create table if not exists results (
  id bigint generated always as identity primary key,
  date text, opposition text,
  "homeScore" integer, "awayScore" integer,
  scorers text[], result text, competition text,
  motm text, "oppMotm" text, "oppLogo" text
);
create table if not exists teams (
  id bigint generated always as identity primary key,
  name text not null, logo text
);
create table if not exists fixtures (
  id bigint generated always as identity primary key,
  date text, "rawDate" text,
  opposition text, competition text, venue text, notes text
);

-- NEW — run these even if you've run the above before
create table if not exists seasons (
  id bigint generated always as identity primary key,
  name text,
  age_group text,
  is_active boolean default false,
  competitions text[] default array['Spring Cup']
);

-- Add season_id to existing tables (safe to run even if column exists)
alter table results add column if not exists season_id bigint references seasons(id);
alter table fixtures add column if not exists season_id bigint references seasons(id);

-- Create your first season
insert into seasons (name, age_group, is_active, competitions)
values ('2025/26', 'Under 9 Blue', true, array['Spring Cup'])
returning id;

-- IMPORTANT: copy the id returned above and use it below
-- Link all your existing results to this season (replace 1 with your actual season id)
update results set season_id = 1 where season_id is null;
update fixtures set season_id = 1 where season_id is null;

-- Row level security (run for new table only)
alter table seasons enable row level security;
create policy "Public" on seasons for all using (true) with check (true);
```

## Step 2 — Add your Supabase keys
Open `src/supabase.js` and fill in your URL and anon key.

## Step 3 — Deploy to Netlify
Upload to GitHub and connect to Netlify as before.

## How seasons work
- The top bar shows the current season name and age group
- Use the dropdown to switch between seasons — data is read-only for past seasons
- Tap "+ NEW SEASON" to roll over to a new season (e.g. Under 10 Blue 2026/27)
- The 🗓 History tab shows a summary card for every season
- H2H results in the Teams tab show games across ALL seasons
