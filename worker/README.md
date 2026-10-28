# Cloudflare version (trial)

- `worker/index.js` – Worker: serves the built app and a JSON API (`/api/<table>`) over D1.
- `worker/schema.sql` – D1 schema. A new club runs this once on an empty D1 database.
- `wrangler.jsonc` – Worker config (static assets from `dist`, D1 binding `DB`).
- `src/api.js` – data layer used by the app (replaces the Supabase REST calls). Image uploads still use Supabase Storage via `src/supabase.js` for now.

Cloudflare build settings: build command `npm run build`, deploy command `npx wrangler deploy`.
Local test: `npm run build && npx wrangler d1 execute <db> --local --file=worker/schema.sql && npx wrangler dev --local`.
