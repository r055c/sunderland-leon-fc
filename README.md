# Sunderland Leon FC — PWA with Online Database

## Step 1 — Set up Supabase (free)

1. Go to https://supabase.com → sign up → create a new project
2. Go to the **SQL Editor** and run this SQL:

```sql
-- Results
create table results (
  id bigint generated always as identity primary key,
  date text, opposition text,
  "homeScore" integer, "awayScore" integer,
  scorers text[], result text, competition text,
  motm text, "oppMotm" text, "oppLogo" text
);

-- Teams
create table teams (
  id bigint generated always as identity primary key,
  name text not null,
  logo text
);

-- Fixtures
create table fixtures (
  id bigint generated always as identity primary key,
  date text, "rawDate" text,
  opposition text, competition text,
  venue text, notes text
);

-- Settings
create table settings (
  id integer primary key default 1,
  team_name text default 'Under 9 Blue',
  competitions text[] default array['Spring Cup']
);
insert into settings (id) values (1) on conflict do nothing;

-- Row level security (allow public access)
alter table results enable row level security;
alter table teams enable row level security;
alter table fixtures enable row level security;
alter table settings enable row level security;
create policy "Public" on results for all using (true) with check (true);
create policy "Public" on teams for all using (true) with check (true);
create policy "Public" on fixtures for all using (true) with check (true);
create policy "Public" on settings for all using (true) with check (true);
```

3. Go to **Settings → API** and copy your **Project URL** and **anon/public key**

---

## Step 2 — Add your keys

Open `src/supabase.js` and replace the placeholders:

```js
export const SUPABASE_URL = "https://your-project.supabase.co";
export const SUPABASE_ANON_KEY = "eyJ...your key...";
```

---

## Step 3 — Deploy to Netlify

1. Create a free GitHub account at github.com
2. Create a new repository called `sunderland-leon-fc`
3. Upload all files from this folder to the repository
4. Create a free Netlify account at netlify.com (sign in with GitHub)
5. Click **Add new site → Import from GitHub → select your repo**
6. Netlify auto-detects settings — click **Deploy**
7. Your app is live at something like `leon-fc.netlify.app`

---

## Step 4 — Install on phones

Share the link. On iPhone: open in Safari → Share → Add to Home Screen.
The Leon badge appears as the app icon, opens full screen.

---

## What's new in this version

- **Teams list** — manage your list of opposition teams with logos
- **Smart team picker** — searchable dropdown when entering results or fixtures  
- **Head-to-head** — tap H2H on any team to see all results against them
- **Fixtures** — add upcoming games with date, venue and notes
- **Online database** — all data shared across every device in real time
