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
  club_settings: {
    cols: ["club_name", "short_name", "slogan", "primary_color", "accent_color", "font_pairing", "badge_url", "updated_at"],
    kinds: {}, order: "id.asc",
  },
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

function readRow(def, row) {
  if (!row) return row;
  const out = { ...row };
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

async function handleApi(request, env, url) {
  const parts = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const [table, idPart, action] = parts;
  const def = TABLES[table];
  if (!def) return json({ error: "Unknown table" }, 404);
  const db = env.DB;
  const method = request.method;
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
    return env.ASSETS.fetch(request);
  },
};
