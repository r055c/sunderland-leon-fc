// src/api.js
// Data layer for the Cloudflare version: talks to the Worker's /api routes (D1 database).
// Same function names and return shapes as the Supabase version in supabase.js.
// Image uploads still go to Supabase Storage for now (see supabase.js).

export { uploadImage } from "./supabase.js";

const headers = { "Content-Type": "application/json" };
const api = (path) => `/api/${path}`;

async function get(table, label, order) {
  const res = await fetch(api(table) + (order ? `?order=${order}` : ""), { headers });
  if (!res.ok) throw new Error(`Failed to fetch ${label}`);
  return res.json();
}
async function post(table, body, label) {
  const res = await fetch(api(table), { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Failed to insert ${label}`);
  return res.json();
}
async function patch(path, body, label) {
  const res = await fetch(api(path), { method: "PATCH", headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Failed to update ${label}`);
  return res.json();
}
async function del(path, label) {
  const res = await fetch(api(path), { method: "DELETE", headers });
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
  const res = await fetch(api(`seasons/${id}/activate`), { method: "POST", headers });
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
