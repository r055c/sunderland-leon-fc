// src/api.js
// Data layer for the Cloudflare version: talks to the Worker's /api routes (D1 database).
// Same function names and return shapes as the Supabase version in supabase.js.
// Image uploads still go to Supabase Storage for now (see supabase.js).

// ── Admin PIN: kept in memory only; sent with every change so the Worker can check it ──
let adminPin = "";
export const setAdminPin = (p) => { adminPin = p || ""; };
const authHeaders = () => (adminPin ? { "x-admin-pin": adminPin } : {});
const hdr = () => ({ "Content-Type": "application/json", ...authHeaders() });
const api = (path) => `/api/${path}`;

export async function verifyAdminPin(pin) {
  try {
    const res = await fetch(api("auth"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
    if (!res.ok) return false;
    setAdminPin(pin);
    return true;
  } catch (e) { return false; }
}
export async function changeAdminPin(next) {
  const res = await fetch(api("pin"), { method: "POST", headers: hdr(), body: JSON.stringify({ next }) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not change PIN");
  setAdminPin(next);
}

// ── Images: shrunk in the browser, then stored by the Worker ──
async function shrink(blob, bucket) {
  const keepAlpha = bucket === "logo" || bucket === "branding" || /png|svg|gif/.test(blob.type);
  const maxDim = keepAlpha ? 512 : 1280;
  if (/svg/.test(blob.type) && blob.size < 400000) return blob;
  try {
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale)), h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!keepAlpha) { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); }
    ctx.drawImage(bmp, 0, 0, w, h);
    const type = keepAlpha ? "image/png" : "image/jpeg";
    const out = await new Promise((r) => canvas.toBlob(r, type, 0.82));
    if (out && (out.size < blob.size || blob.size > 1000000)) return out;
  } catch (e) { /* fall back to the original */ }
  return blob;
}
export async function uploadImage(file, bucket = "logos") {
  const body = await shrink(file, bucket);
  const res = await fetch(api("upload"), { method: "POST", headers: { ...authHeaders(), "Content-Type": body.type || "image/png" }, body });
  if (!res.ok) throw new Error(`Upload failed: ${(await res.json().catch(() => ({}))).error || res.status}`);
  return (await res.json()).url;
}
// Home-screen icon: the badge centred on a light square, 512x512 (iPhones fill transparent areas with black).
export async function uploadIcon(file) {
  const bmp = await createImageBitmap(file);
  const size = 512, pad = 0.14;
  const canvas = document.createElement("canvas"); canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f8f8f8"; ctx.fillRect(0, 0, size, size);
  const box = size * (1 - pad * 2), sc = Math.min(box / bmp.width, box / bmp.height);
  const w = bmp.width * sc, h = bmp.height * sc;
  ctx.drawImage(bmp, (size - w) / 2, (size - h) / 2, w, h);
  const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
  const res = await fetch(api("upload"), { method: "POST", headers: { ...authHeaders(), "Content-Type": "image/png" }, body: blob });
  if (!res.ok) throw new Error("Icon upload failed");
  return (await res.json()).url;
}
// One-off: copy images that still live on Supabase into this app, then point the data at the copies.
export async function moveExternalImages(onProgress) {
  const listRes = await fetch(api("external-images"), { headers: hdr() });
  if (!listRes.ok) throw new Error("Could not list images");
  const urls = await listRes.json();
  let moved = 0; const failed = [];
  for (let i = 0; i < urls.length; i++) {
    onProgress && onProgress(i, urls.length);
    try {
      const r = await fetch(urls[i]);
      if (!r.ok) throw new Error(String(r.status));
      const blob = await r.blob();
      const bucket = /\/(logo|branding)\//.test(urls[i]) ? "logo" : "players";
      const file = new File([blob], "x", { type: blob.type || "image/png" });
      const local = await uploadImage(file, bucket);
      const rel = await fetch(api("relink-image"), { method: "POST", headers: hdr(), body: JSON.stringify({ from: urls[i], to: local }) });
      if (!rel.ok) throw new Error("relink");
      moved++;
    } catch (e) { failed.push(urls[i]); }
  }
  onProgress && onProgress(urls.length, urls.length);
  return { total: urls.length, moved, failed };
}

async function get(table, label, order) {
  const res = await fetch(api(table) + (order ? `?order=${order}` : ""), { headers: hdr() });
  if (!res.ok) throw new Error(`Failed to fetch ${label}`);
  return res.json();
}
async function post(table, body, label) {
  const res = await fetch(api(table), { method: "POST", headers: hdr(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Failed to insert ${label}`);
  return res.json();
}
async function patch(path, body, label) {
  const res = await fetch(api(path), { method: "PATCH", headers: hdr(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Failed to update ${label}`);
  return res.json();
}
async function del(path, label) {
  const res = await fetch(api(path), { method: "DELETE", headers: hdr() });
  if (!res.ok) throw new Error(`Failed to delete ${label}`);
}
const strip = ({ id, ...data }) => data;

// ── Results ──
export const fetchResults = () => get("results", "results", "date.desc");
export async function insertResult(result) { return (await post("results", strip(result), "result"))[0]; }
export async function updateResult(result) { return (await patch(`results/${result.id}`, strip(result), "result"))[0]; }
export const deleteResult = (id) => del(`results/${id}`, "result");

// ── Teams ──
export const fetchTeams = () => get("teams", "teams", "name.asc");
export async function insertTeam(team) { return (await post("teams", strip(team), "team"))[0]; }
export async function updateTeam(team) { return (await patch(`teams/${team.id}`, strip(team), "team"))[0]; }
export const deleteTeam = (id) => del(`teams/${id}`, "team");

// ── Seasons ──
export const fetchSeasons = () => get("seasons", "seasons", "id.desc");
export async function insertSeason(season) { return (await post("seasons", strip(season), "season"))[0]; }
export async function updateSeason(season) { return (await patch(`seasons/${season.id}`, strip(season), "season"))[0]; }
export async function setActiveSeason(id) {
  const res = await fetch(api(`seasons/${id}/activate`), { method: "POST", headers: hdr() });
  if (!res.ok) throw new Error("Failed to set active season");
}

// ── Players ──
export const fetchPlayers = () => get("players", "players", "squad_number.asc");
export async function insertPlayer(player) { return (await post("players", strip(player), "player"))[0]; }
export async function updatePlayer(player) { return (await patch(`players/${player.id}`, strip(player), "player"))[0]; }
export const deletePlayer = (id) => del(`players/${id}`, "player");

// ── Appearances ──
export const fetchAppearances = () => get("appearances", "appearances", "id.desc");
export const insertAppearances = (records) => post("appearances", records, "appearances");
export const deleteAppearancesByResult = (resultId) => del(`appearances?result_id=${resultId}`, "appearances");

// ── Match photos ──
export const fetchMatchPhotos = () => get("match_photos", "match photos", "id.desc");
export const insertMatchPhotos = (records) => post("match_photos", records, "match photos");
export const deleteMatchPhoto = (id) => del(`match_photos/${id}`, "match photo");

// ── Club settings (branding) ──
export async function fetchClubSettings() { return (await get("club_settings", "club settings"))[0] || null; }
export async function saveClubSettings(s) {
  const { id, ...data } = s;
  return (await patch("club_settings", { ...data, updated_at: new Date().toISOString() }, "club settings"))[0];
}
