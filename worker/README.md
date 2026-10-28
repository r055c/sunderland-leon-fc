# Cloudflare version

- `worker/index.js` – Worker: serves the built app, a JSON API (`/api/<table>`) over D1, admin PIN checks, and image storage (`/img/<id>`).
- `worker/schema.sql` – D1 schema for a new club. `worker/migrations/` – changes for databases created earlier.
- `wrangler.jsonc` – config for the Leon Worker. Other clubs: `clubs/<club>/wrangler.jsonc` (see `docs/ADD-A-CLUB.md`).
- `src/api.js` – data layer used by the app.

Local test: `npm run build && npx wrangler d1 execute <db> --local --file=worker/schema.sql && npx wrangler dev --local`
