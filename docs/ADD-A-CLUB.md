# Adding a club

One codebase, one Cloudflare project per club. Every club builds from the same branch, so a push
updates all of them. Each club has its own database, its own address and its own admin PIN.

## What each club has
| Thing | Where |
|---|---|
| Name / short name for the installed app | `clubs/<club>/club.json` |
| Worker name + database | `clubs/<club>/wrangler.jsonc` (Leon uses the root `wrangler.jsonc`) |
| Branding, colours, crest, admin PIN | stored in the club's own database, edited in the app (Staff Room → Branding) |

## Steps (about 5 minutes)
1. **Database** – create a D1 database (`<club>-trial` or similar), run `worker/schema.sql` on it, then set the club name:
   `UPDATE club_settings SET club_name='…', short_name='…' WHERE id=1;`
   Starting admin PIN is **0000** – the club should change it straight away (Staff Room → Branding → Admin PIN).
2. **Config files** – copy `clubs/norton/` to `clubs/<club>/`, edit `club.json`, and in `wrangler.jsonc` set the Worker `name`, `database_name` and `database_id`.
3. **Cloudflare project** – Workers & Pages → Create → Import a repository → this repo.
   - Project name: exactly the `name` in the club's `wrangler.jsonc`
   - Production branch: the branch every club builds from
   - Build command: `CLUB=<club> npm run build`
   - Deploy command: `npx wrangler deploy -c clubs/<club>/wrangler.jsonc`
4. Open `https://<name>.<your-account>.workers.dev`.

## Updating
Push to the branch. Every club project rebuilds and deploys. If a change needs a new database column,
add a numbered file in `worker/migrations/` and run it on every club's database **before** pushing.

## Notes
- Images are stored in the club's database (shrunk in the browser first). The Staff Room → Branding screen has a one-off
  "Move images into this app" button for copying images from the old Supabase storage.
- Free-tier limits worth knowing (check Cloudflare's current limits): number of D1 databases per account, daily Worker requests shared across the account, monthly build minutes.
