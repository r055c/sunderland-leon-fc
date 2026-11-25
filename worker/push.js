// Goal alerts (Web Push) for the Worker. No third-party service and no keys to set up by hand:
// the VAPID key pair is created on first use and kept in D1, and the tables are created when first needed.
// Parents subscribe anonymously (just the phone's push address); staff queue alerts, which wait ~30 seconds so a mis-tap can be undone.

const enc = new TextEncoder();
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

const b64u = {
  enc: (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  dec: (s) => {
    const p = String(s).replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(p + "=".repeat((4 - (p.length % 4)) % 4));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  },
};
const concat = (...arrs) => {
  const out = new Uint8Array(arrs.reduce((n, a) => n + a.length, 0));
  let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
};

export const DELAY_MS = 30000;
const KIND_PREF = { goal_us: "goals", goal_them: "theirs", kickoff: "kickoff", halftime: "halftime", fulltime: "fulltime" };
export const DEFAULT_PREFS = { goals: true, theirs: true, kickoff: false, halftime: false, fulltime: true };

let ready = false;
async function ensureTables(db) {
  if (ready) return;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS push_subs (endpoint TEXT PRIMARY KEY, p256dh TEXT NOT NULL, auth TEXT NOT NULL, prefs TEXT, created INTEGER)"),
    db.prepare("CREATE TABLE IF NOT EXISTS push_queue (key TEXT PRIMARY KEY, kind TEXT, title TEXT, body TEXT, body_anon TEXT, send_at INTEGER, sent INTEGER DEFAULT 0, created INTEGER)"),
    db.prepare("CREATE TABLE IF NOT EXISTS push_settings (k TEXT PRIMARY KEY, v TEXT)"),
  ]);
  ready = true;
}

const getSetting = async (db, k) => (await db.prepare("SELECT v FROM push_settings WHERE k = ?").bind(k).first())?.v ?? null;
const setSetting = (db, k, v) => db.prepare("INSERT INTO push_settings (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").bind(k, String(v)).run();

async function vapidKeys(db) {
  const stored = await getSetting(db, "vapid");
  if (stored) return JSON.parse(stored);
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const pub = b64u.enc(await crypto.subtle.exportKey("raw", pair.publicKey));
  const priv = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const keys = { pub, priv };
  // INSERT OR IGNORE then re-read, so two first requests at once still end up agreeing on one key.
  await db.prepare("INSERT OR IGNORE INTO push_settings (k, v) VALUES ('vapid', ?)").bind(JSON.stringify(keys)).run();
  return JSON.parse(await getSetting(db, "vapid"));
}

async function vapidHeader(keys, endpoint) {
  const aud = new URL(endpoint).origin;
  const head = b64u.enc(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64u.enc(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "mailto:admin@example.com" })));
  const key = await crypto.subtle.importKey("jwk", keys.priv, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(`${head}.${claims}`));
  return `vapid t=${head}.${claims}.${b64u.enc(sig)}, k=${keys.pub}`;
}

const hkdf = async (salt, ikm, info, bytes) => {
  const k = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, k, bytes * 8));
};

// RFC 8291 (aes128gcm) payload encryption.
export async function encryptPayload(sub, payload) {
  const uaPublic = b64u.dec(sub.p256dh);
  const auth = b64u.dec(sub.auth);
  const asPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", asPair.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const secret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, asPair.privateKey, 256));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hkdf(auth, secret, concat(enc.encode("WebPush: info\0"), uaPublic, asPublic), 32);
  const cek = await hkdf(salt, prk, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, prk, enc.encode("Content-Encoding: nonce\0"), 12);
  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, concat(enc.encode(payload), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]); // record size 4096
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, cipher);
}

async function sendOne(keys, sub, message) {
  const body = await encryptPayload(sub, JSON.stringify(message));
  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: { "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: "900", Urgency: "high", Authorization: await vapidHeader(keys, sub.endpoint) },
    body,
  });
  return res.status;
}

const parsePrefs = (s) => { try { return { ...DEFAULT_PREFS, ...JSON.parse(s) }; } catch (e) { return { ...DEFAULT_PREFS }; } };

// Send everything that is due. Each queued alert is claimed (sent=1) before sending so overlapping calls never double-send.
export async function flushDue(db) {
  await ensureTables(db);
  const now = Date.now();
  const { results: due } = await db.prepare("UPDATE push_queue SET sent = 1 WHERE sent = 0 AND send_at <= ? RETURNING *").bind(now).all();
  if (!due.length) return 0;
  const keys = await vapidKeys(db);
  const names = (await getSetting(db, "names")) !== "0";
  const { results: subs } = await db.prepare("SELECT * FROM push_subs").all();
  let sent = 0;
  for (const item of due) {
    if (now - item.send_at > 15 * 60 * 1000) continue; // too old to be useful
    const pref = KIND_PREF[item.kind] || "goals";
    const body = names ? item.body : (item.body_anon ?? item.body);
    const message = { title: item.title, body, tag: item.key, url: "/" };
    const targets = subs.filter((s) => parsePrefs(s.prefs)[pref]);
    for (let i = 0; i < targets.length; i += 20) {
      const chunk = targets.slice(i, i + 20);
      const codes = await Promise.all(chunk.map((s) => sendOne(keys, s, message).catch(() => 0)));
      const dead = chunk.filter((_, k) => codes[k] === 404 || codes[k] === 410);
      if (dead.length) await db.batch(dead.map((s) => db.prepare("DELETE FROM push_subs WHERE endpoint = ?").bind(s.endpoint)));
      sent += codes.filter((c) => c >= 200 && c < 300).length;
    }
  }
  // Housekeeping: forget alerts older than a day.
  await db.prepare("DELETE FROM push_queue WHERE created < ?").bind(now - 24 * 3600 * 1000).run();
  return sent;
}

const clean = (v, n) => String(v ?? "").slice(0, n);

export async function handlePush(request, env, url, parts, ctx, checkPin) {
  const db = env.DB;
  await ensureTables(db);
  const sub = parts[1];
  const method = request.method;
  const needPin = async () => (await checkPin(db, request.headers.get("x-admin-pin") || "")) ? null : (await new Promise((r) => setTimeout(r, 400)), json({ error: "Admin PIN required" }, 401));

  if (sub === "key" && method === "GET") return json({ key: (await vapidKeys(db)).pub });

  if (sub === "subscribe" && method === "POST") {
    const { subscription: s, prefs } = await request.json().catch(() => ({}));
    const endpoint = s?.endpoint, p256dh = s?.keys?.p256dh, auth = s?.keys?.auth;
    if (!/^https:\/\//.test(String(endpoint || "")) || String(endpoint).length > 600 || !p256dh || !auth) return json({ error: "Bad subscription" }, 400);
    const { n } = (await db.prepare("SELECT COUNT(*) AS n FROM push_subs").first()) || { n: 0 };
    if (n > 3000) return json({ error: "Too many subscribers" }, 429);
    await db.prepare("INSERT INTO push_subs (endpoint, p256dh, auth, prefs, created) VALUES (?, ?, ?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, prefs = excluded.prefs")
      .bind(endpoint, p256dh, auth, JSON.stringify({ ...DEFAULT_PREFS, ...(prefs || {}) }), Date.now()).run();
    return json({ ok: true });
  }
  if (sub === "prefs" && method === "POST") {
    const { endpoint, prefs } = await request.json().catch(() => ({}));
    await db.prepare("UPDATE push_subs SET prefs = ? WHERE endpoint = ?").bind(JSON.stringify({ ...DEFAULT_PREFS, ...(prefs || {}) }), String(endpoint || "")).run();
    return json({ ok: true });
  }
  if (sub === "prefs-get" && method === "POST") {
    const { endpoint } = await request.json().catch(() => ({}));
    const row = await db.prepare("SELECT prefs FROM push_subs WHERE endpoint = ?").bind(String(endpoint || "")).first();
    return json({ subscribed: !!row, prefs: row ? parsePrefs(row.prefs) : null });
  }
  if (sub === "unsubscribe" && method === "POST") {
    const { endpoint } = await request.json().catch(() => ({}));
    await db.prepare("DELETE FROM push_subs WHERE endpoint = ?").bind(String(endpoint || "")).run();
    return json({ ok: true });
  }

  // Anyone may ask for due alerts to be sent: it only releases alerts staff already queued, and only once their delay has passed.
  if (sub === "flush" && method === "POST") return json({ sent: await flushDue(db) });

  if (sub === "settings" && method === "GET") {
    const denied = await needPin(); if (denied) return denied;
    const { n } = (await db.prepare("SELECT COUNT(*) AS n FROM push_subs").first()) || { n: 0 };
    return json({ names: (await getSetting(db, "names")) !== "0", subscribers: n });
  }
  if (sub === "settings" && method === "POST") {
    const denied = await needPin(); if (denied) return denied;
    const { names } = await request.json().catch(() => ({}));
    if (typeof names === "boolean") await setSetting(db, "names", names ? "1" : "0");
    return json({ ok: true });
  }

  if (sub === "queue" && method === "POST") {
    const denied = await needPin(); if (denied) return denied;
    const b = await request.json().catch(() => ({}));
    const key = clean(b.key, 80), kind = clean(b.kind, 20);
    if (!key || !KIND_PREF[kind]) return json({ error: "Bad alert" }, 400);
    const delay = b.delay === 0 ? 0 : DELAY_MS;
    const now = Date.now();
    // Same alert queued again (e.g. a goal's minute or scorer edited): update it while it is still waiting; ignore once sent.
    const existing = await db.prepare("SELECT sent FROM push_queue WHERE key = ?").bind(key).first();
    if (existing) {
      if (!existing.sent) await db.prepare("UPDATE push_queue SET title = ?, body = ?, body_anon = ? WHERE key = ? AND sent = 0").bind(clean(b.title, 120), clean(b.body, 200), clean(b.bodyAnon, 200), key).run();
    } else {
      await db.prepare("INSERT INTO push_queue (key, kind, title, body, body_anon, send_at, sent, created) VALUES (?, ?, ?, ?, ?, ?, 0, ?)")
        .bind(key, kind, clean(b.title, 120), clean(b.body, 200), clean(b.bodyAnon, 200), now + delay, now).run();
    }
    if (delay === 0) ctx?.waitUntil?.(flushDue(db));
    return json({ ok: true });
  }

  // A goal was taken back. Still waiting: nothing is ever sent. Already sent: send a short correction.
  if (sub === "cancel" && method === "POST") {
    const denied = await needPin(); if (denied) return denied;
    const b = await request.json().catch(() => ({}));
    const key = clean(b.key, 80);
    const row = await db.prepare("SELECT kind, sent FROM push_queue WHERE key = ?").bind(key).first();
    if (!row) return json({ ok: true, cancelled: false });
    if (!row.sent) {
      await db.prepare("DELETE FROM push_queue WHERE key = ? AND sent = 0").bind(key).run();
      return json({ ok: true, cancelled: true });
    }
    const ckey = `corr:${key}`;
    if (b.correction && !(await db.prepare("SELECT 1 AS x FROM push_queue WHERE key = ?").bind(ckey).first())) {
      const now = Date.now();
      await db.prepare("INSERT INTO push_queue (key, kind, title, body, body_anon, send_at, sent, created) VALUES (?, ?, ?, ?, ?, ?, 0, ?)")
        .bind(ckey, row.kind, clean(b.correction.title, 120), clean(b.correction.body, 200), clean(b.correction.body, 200), now, now).run();
      ctx?.waitUntil?.(flushDue(db));
    }
    return json({ ok: true, cancelled: false, corrected: true });
  }

  return json({ error: "Not found" }, 404);
}
