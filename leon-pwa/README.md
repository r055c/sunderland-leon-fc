# Sunderland Leon FC — PWA with Online Database

## Overview
This is a Progressive Web App (PWA) that stores all data in a free Supabase database,
meaning results entered on any device are visible to everyone instantly.

---

## Step 1 — Set up your free Supabase database (~5 mins)

1. Go to https://supabase.com and click **Start your project** (sign up free)
2. Click **New Project**, give it a name like `leon-fc`, set a password, click **Create**
3. Wait about 1 minute for it to set up
4. Go to the **SQL Editor** (left sidebar) and paste in this SQL, then click **Run**:

```sql
create table results (
  id bigint generated always as identity primary key,
  date text,
  opposition text,
  "homeScore" integer,
  "awayScore" integer,
  scorers text[],
  result text,
  competition text,
  motm text,
  "oppMotm" text,
  "oppLogo" text
);

create table settings (
  id integer primary key default 1,
  team_name text default 'Under 9 Blue',
  competitions text[] default array['Spring Cup']
);

insert into settings (id, team_name, competitions) values (1, 'Under 9 Blue', array['Spring Cup'])
  on conflict (id) do nothing;

-- Allow public read/write (fine for a private team app)
alter table results enable row level security;
alter table settings enable row level security;
create policy "Public access" on results for all using (true) with check (true);
create policy "Public access" on settings for all using (true) with check (true);
```

5. Go to **Project Settings** → **API** (left sidebar)
6. Copy your **Project URL** and **anon/public** key

---

## Step 2 — Add your keys to the app

Open `src/supabase.js` and replace the two placeholder values:

```js
export const SUPABASE_URL = "YOUR_SUPABASE_URL";      // paste your Project URL here
export const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";  // paste your anon key here
```

---

## Step 3 — Deploy to Netlify (~5 mins)

1. Go to https://github.com and create a free account
2. Create a new repository called `sunderland-leon-fc` (set to Public)
3. Upload all the files from this folder into the repository
4. Go to https://netlify.com, sign up free, click **Add new site** → **Import from GitHub**
5. Select your repository — Netlify will auto-detect the build settings from `netlify.toml`
6. Click **Deploy site**
7. Your app will be live at something like `https://sunderland-leon.netlify.app`

---

## Step 4 — Install on phones

Share the link. On iPhone:
1. Open in **Safari**
2. Tap the **Share** button (box with arrow pointing up)
3. Tap **Add to Home Screen**
4. Tap **Add**

The Leon FC badge will appear as the app icon. It opens full screen like a real app.

---

## Updating in future
Any time you make changes, just update the files on GitHub and Netlify redeploys automatically within 1-2 minutes.

## Cost
Everything here is completely free — Supabase free tier, Netlify free tier, GitHub free.
