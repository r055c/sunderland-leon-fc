// Cloudflare Worker: serves the built app (static assets) and a small JSON API over D1.
// The API mirrors what the app previously got from Supabase REST, one table per route.

// Column definitions. kind: "array" | "object" (stored as JSON text), "bool" (stored 0/1).
const TABLES = {
  results: {
    cols: ["date", "opposition", "homeScore", "awayScore", "scorers", "result", "competition", "motm", "oppMotm", "oppLogo", "season_id", "round"],
    kinds: { scorers: "array" },
    order: "date.desc",
  },
  teams: { cols: ["name", "logo"], kinds: {}, order: "name.asc" },
  fixtures: { cols: ["date", "rawDate", "opposition", "competition", "venue", "notes", "season_id"], kinds: {}, order: "id.asc" },
  seasons: {
    cols: ["name", "age_group", "is_active", "competitions", "placements", "competition_types"],
    kinds: { is_active: "bool", competitions: "array", placements: "object", competition_types: "object" },
    order: "id.desc",
  },
  players: { cols: ["name", "squad_number", "photo", "is_active"], kinds: { is_active: "bool" }, order: "squad_number.asc" },
  appearances: { cols: ["player_id", "result_id", "season_id"], kinds: {}, order: "id.desc" },
  match_photos: { cols: ["result_id", "url"], kinds: {}, order: "id.desc", extraRead: ["created_at"] },
  match_videos: { cols: ["result_id", "video_id", "title"], kinds: {}, order: "id.desc", extraRead: ["created_at"] },
  club_settings: {
    cols: ["club_name", "short_name", "slogan", "primary_color", "accent_color", "font_pairing", "badge_url", "icon_url", "updated_at"],
    kinds: {}, order: "id.asc",
  },
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

function readRow(def, row) {
  if (!row) return row;
  const out = { ...row };
  delete out.admin_pin_hash; // never sent to the browser
  for (const [col, kind] of Object.entries(def.kinds)) {
    const v = out[col];
    if (v === null || v === undefined) { if (kind === "array") out[col] = null; continue; }
    if (kind === "bool") out[col] = v === 1 || v === true;
    else { try { out[col] = JSON.parse(v); } catch (e) { out[col] = kind === "array" ? [] : {}; } }
  }
  return out;
}

function writeValues(def, body) {
  const cols = [], vals = [];
  for (const col of def.cols) {
    if (!(col in body)) continue;
    let v = body[col];
    const kind = def.kinds[col];
    if (v === undefined) continue;
    if (v !== null) {
      if (kind === "bool") v = v ? 1 : 0;
      else if (kind === "array" || kind === "object") v = JSON.stringify(v);
    }
    cols.push(col); vals.push(v);
  }
  return { cols, vals };
}

function orderClause(def, requested) {
  const spec = requested || def.order;
  const [col, dirRaw] = spec.split(".");
  const known = ["id", ...def.cols, ...(def.extraRead || [])];
  if (!known.includes(col)) return "";
  const text = ["name", "opposition"].includes(col) ? " COLLATE NOCASE" : "";
  // Match Postgres null ordering: NULLs last for ASC, first for DESC.
  if (dirRaw === "desc") return ` ORDER BY ("${col}" IS NOT NULL), "${col}"${text} DESC`;
  return ` ORDER BY ("${col}" IS NULL), "${col}"${text} ASC`;
}


// ── Admin PIN (checked here, so the browser can't skip it) ──────────────
async function sha256Hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
async function checkPin(db, pin) {
  if (!pin) return false;
  const row = await db.prepare("SELECT admin_pin_hash AS h FROM club_settings WHERE id = 1").first();
  if (!row || !row.h) return false;
  const [salt, hash] = row.h.split("$");
  return safeEqual(await sha256Hex(`${salt}:${pin}`), hash || "");
}
async function newPinHash(pin) {
  const salt = [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${salt}$${await sha256Hex(`${salt}:${pin}`)}`;
}

// ── Images (stored in D1 as base64 so no extra service is needed) ───────
const MAX_IMAGE_BYTES = 1_200_000;
function toBase64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function fromBase64(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function serveImage(env, id) {
  const row = await env.DB.prepare("SELECT content_type AS t, data AS d FROM images WHERE id = ?").bind(id).first();
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(fromBase64(row.d), {
    headers: { "content-type": row.t, "cache-control": "public, max-age=31536000, immutable" },
  });
}
// Columns that can hold an image link: [table, column]
const IMAGE_COLS = [["teams", "logo"], ["players", "photo"], ["results", "oppLogo"], ["match_photos", "url"], ["club_settings", "badge_url"], ["club_settings", "icon_url"]];

// Home-screen icons: if the club has uploaded its own, serve that; otherwise the built-in icon files.
const ICON_PATHS = ["/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];
async function serveIcon(request, env) {
  try {
    const row = await env.DB.prepare("SELECT icon_url AS u FROM club_settings WHERE id = 1").first();
    const m = row && row.u && /^\/img\/([0-9a-f]{24})$/.exec(row.u);
    if (m) {
      const res = await serveImage(env, m[1]);
      if (res.ok) { const h = new Headers(res.headers); h.set("cache-control", "public, max-age=300"); return new Response(res.body, { headers: h }); }
    }
  } catch (e) { /* fall through to the built-in icon */ }
  return env.ASSETS.fetch(request);
}

async function handleSpecial(request, env, url, parts) {
  const db = env.DB;
  const [name] = parts;
  const method = request.method;

  if (name === "auth" && method === "POST") {
    const { pin } = await request.json().catch(() => ({}));
    const ok = await checkPin(db, String(pin || ""));
    if (!ok) { await new Promise((r) => setTimeout(r, 400)); return json({ ok: false }, 401); }
    return json({ ok: true });
  }

  // Everything below needs the admin PIN.
  if (!(await checkPin(db, request.headers.get("x-admin-pin") || ""))) {
    await new Promise((r) => setTimeout(r, 400));
    return json({ error: "Admin PIN required" }, 401);
  }

  if (name === "pin" && method === "POST") {
    const { next } = await request.json().catch(() => ({}));
    if (!/^\d{4,8}$/.test(String(next || ""))) return json({ error: "PIN must be 4 to 8 digits" }, 400);
    await db.prepare("UPDATE club_settings SET admin_pin_hash = ? WHERE id = 1").bind(await newPinHash(String(next))).run();
    return json({ ok: true });
  }

  if (name === "upload" && method === "POST") {
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (!bytes.length) return json({ error: "Empty file" }, 400);
    if (bytes.length > MAX_IMAGE_BYTES) return json({ error: "Image too large (max ~1.2 MB)" }, 413);
    const type = (request.headers.get("content-type") || "").split(";")[0];
    if (!/^image\/(png|jpeg|webp|gif|svg\+xml)$/.test(type)) return json({ error: "Not an image" }, 415);
    const id = [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, "0")).join("");
    await db.prepare("INSERT INTO images (id, content_type, data) VALUES (?, ?, ?)").bind(id, type, toBase64(bytes)).run();
    return json({ url: `/img/${id}` }, 201);
  }

  // Image links that still point outside this app (e.g. old Supabase storage).
  if (name === "external-images" && method === "GET") {
    const found = new Set();
    for (const [t, c] of IMAGE_COLS) {
      const { results } = await db.prepare(`SELECT DISTINCT "${c}" AS u FROM ${t} WHERE "${c}" LIKE 'http%'`).all();
      results.forEach((r) => found.add(r.u));
    }
    return json([...found]);
  }
  if (name === "relink-image" && method === "POST") {
    const { from, to } = await request.json().catch(() => ({}));
    if (!from || !/^\/img\/[0-9a-f]{24}$/.test(String(to || ""))) return json({ error: "Bad request" }, 400);
    await db.batch(IMAGE_COLS.map(([t, c]) => db.prepare(`UPDATE ${t} SET "${c}" = ? WHERE "${c}" = ?`).bind(to, from)));
    return json({ ok: true });
  }
  return json({ error: "Not found" }, 404);
}

async function handleApi(request, env, url) {
  const parts = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const [table, idPart, action] = parts;
  if (["auth", "pin", "upload", "external-images", "relink-image"].includes(table)) {
    return handleSpecial(request, env, url, parts);
  }
  const def = TABLES[table];
  if (!def) return json({ error: "Unknown table" }, 404);
  const db = env.DB;
  const method = request.method;
  // Anyone can read; only someone with the admin PIN can change anything.
  if (method !== "GET" && !(await checkPin(db, request.headers.get("x-admin-pin") || ""))) {
    await new Promise((r) => setTimeout(r, 400));
    return json({ error: "Admin PIN required" }, 401);
  }
  const idNum = idPart !== undefined ? Number(idPart) : undefined;
  if (idPart !== undefined && !Number.isInteger(idNum)) return json({ error: "Bad id" }, 400);

  // Special: make one season active, all others inactive.
  if (table === "seasons" && action === "activate" && method === "POST") {
    await db.batch([
      db.prepare("UPDATE seasons SET is_active = 0"),
      db.prepare("UPDATE seasons SET is_active = 1 WHERE id = ?").bind(idNum),
    ]);
    return json({ ok: true });
  }

  if (method === "GET") {
    const q = `SELECT * FROM ${table}${orderClause(def, url.searchParams.get("order"))}`;
    const { results } = await db.prepare(q).all();
    return json(results.map((r) => readRow(def, r)));
  }

  if (method === "POST") {
    const body = await request.json();
    const items = Array.isArray(body) ? body : [body];
    if (!items.length) return json([]);
    if (table === "match_videos" && items.some((i) => !/^[A-Za-z0-9_-]{11}$/.test(String(i.video_id || "")))) {
      return json({ error: "Not a YouTube video id" }, 400);
    }
    const stmts = items.map((item) => {
      const { cols, vals } = writeValues(def, item);
      if (!cols.length) return db.prepare(`INSERT INTO ${table} DEFAULT VALUES RETURNING *`);
      const sql = `INSERT INTO ${table} (${cols.map((c) => `"${c}"`).join(",")}) VALUES (${cols.map(() => "?").join(",")}) RETURNING *`;
      return db.prepare(sql).bind(...vals);
    });
    const batched = await db.batch(stmts);
    return json(batched.flatMap((b) => b.results.map((r) => readRow(def, r))), 201);
  }

  if (method === "PATCH") {
    const body = await request.json();
    const { cols, vals } = writeValues(def, body);
    if (table === "club_settings") {
      if (!cols.length) return json([]);
      const row = await db
        .prepare(`UPDATE club_settings SET ${cols.map((c) => `"${c}" = ?`).join(",")} WHERE id = 1 RETURNING *`)
        .bind(...vals).first();
      return json([readRow(def, row)]);
    }
    if (idNum === undefined) return json({ error: "id required" }, 400);
    if (!cols.length) return json([]);
    const row = await db
      .prepare(`UPDATE ${table} SET ${cols.map((c) => `"${c}" = ?`).join(",")} WHERE id = ? RETURNING *`)
      .bind(...vals, idNum).first();
    return json(row ? [readRow(def, row)] : []);
  }

  if (method === "DELETE") {
    if (idNum !== undefined) {
      if (table === "results") {
        // Mirror the FK dependants so a deleted result never leaves orphans.
        await db.batch([
          db.prepare("DELETE FROM appearances WHERE result_id = ?").bind(idNum),
          db.prepare("DELETE FROM match_photos WHERE result_id = ?").bind(idNum),
          db.prepare("DELETE FROM match_videos WHERE result_id = ?").bind(idNum),
          db.prepare("DELETE FROM results WHERE id = ?").bind(idNum),
        ]);
      } else {
        await db.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(idNum).run();
      }
      return json({ ok: true });
    }
    // Bulk delete only supported for appearances by result_id (used when re-saving a result).
    const resultId = Number(url.searchParams.get("result_id"));
    if (table === "appearances" && Number.isInteger(resultId)) {
      await db.prepare("DELETE FROM appearances WHERE result_id = ?").bind(resultId).run();
      return json({ ok: true });
    }
    return json({ error: "Unsupported delete" }, 400);
  }

  return json({ error: "Method not allowed" }, 405);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env, url);
      } catch (e) {
        return json({ error: String(e && e.message ? e.message : e) }, 500);
      }
    }
    if (ICON_PATHS.includes(url.pathname)) return serveIcon(request, env);
    if (url.pathname.startsWith("/img/")) {
      const id = url.pathname.slice(5);
      if (!/^[0-9a-f]{24}$/.test(id)) return new Response("Not found", { status: 404 });
      return serveImage(env, id);
    }
    return env.ASSETS.fetch(request);
  },
};
