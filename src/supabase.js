// src/supabase.js
export const SUPABASE_URL = "https://fboroiqklryquxbwuyip.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZib3JvaXFrbHJ5cXV4Ynd1eWlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMjM0MzAsImV4cCI6MjA5NzY5OTQzMH0.UMChfFZn3HMbeUdQQK20Dv1RgmmIcm6QK5yxbuhF5ow";

const headers = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_ANON_KEY,
  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
  "Prefer": "return=representation",
};
const base = () => `${SUPABASE_URL}/rest/v1`;

export async function fetchResults() {
  const res = await fetch(`${base()}/results?order=date.desc`, { headers });
  if (!res.ok) throw new Error("Failed to fetch results");
  return res.json();
}
export async function insertResult(result) {
  const { id, ...data } = result;
  const res = await fetch(`${base()}/results`, { method: "POST", headers, body: JSON.stringify(data) });
  if (!res.ok) throw new Error("Failed to insert result");
  return (await res.json())[0];
}
export async function updateResult(result) {
  const { id, ...data } = result;
  const res = await fetch(`${base()}/results?id=eq.${id}`, { method: "PATCH", headers, body: JSON.stringify(data) });
  if (!res.ok) throw new Error("Failed to update result");
  return (await res.json())[0];
}
export async function deleteResult(id) {
  const res = await fetch(`${base()}/results?id=eq.${id}`, { method: "DELETE", headers });
  if (!res.ok) throw new Error("Failed to delete result");
}

export async function fetchTeams() {
  const res = await fetch(`${base()}/teams?order=name.asc`, { headers });
  if (!res.ok) throw new Error("Failed to fetch teams");
  return res.json();
}
export async function insertTeam(team) {
  const { id, ...data } = team;
  const res = await fetch(`${base()}/teams`, { method: "POST", headers, body: JSON.stringify(data) });
  if (!res.ok) throw new Error("Failed to insert team");
  return (await res.json())[0];
}
export async function updateTeam(team) {
  const { id, ...data } = team;
  const res = await fetch(`${base()}/teams?id=eq.${id}`, { method: "PATCH", headers, body: JSON.stringify(data) });
  if (!res.ok) throw new Error("Failed to update team");
  return (await res.json())[0];
}
export async function deleteTeam(id) {
  const res = await fetch(`${base()}/teams?id=eq.${id}`, { method: "DELETE", headers });
  if (!res.ok) throw new Error("Failed to delete team");
}

export async function fetchFixtures() {
  const res = await fetch(`${base()}/fixtures?order=date.asc`, { headers });
  if (!res.ok) throw new Error("Failed to fetch fixtures");
  return res.json();
}
export async function insertFixture(fixture) {
  const { id, ...data } = fixture;
  const res = await fetch(`${base()}/fixtures`, { method: "POST", headers, body: JSON.stringify(data) });
  if (!res.ok) throw new Error("Failed to insert fixture");
  return (await res.json())[0];
}
export async function updateFixture(fixture) {
  const { id, ...data } = fixture;
  const res = await fetch(`${base()}/fixtures?id=eq.${id}`, { method: "PATCH", headers, body: JSON.stringify(data) });
  if (!res.ok) throw new Error("Failed to update fixture");
  return (await res.json())[0];
}
export async function deleteFixture(id) {
  const res = await fetch(`${base()}/fixtures?id=eq.${id}`, { method: "DELETE", headers });
  if (!res.ok) throw new Error("Failed to delete fixture");
}

export async function fetchSettings() {
  const res = await fetch(`${base()}/settings?id=eq.1`, { headers });
  if (!res.ok) throw new Error("Failed to fetch settings");
  return (await res.json())[0] || null;
}
export async function upsertSettings(data) {
  const res = await fetch(`${base()}/settings?id=eq.1`, {
    method: "PATCH",
    headers: { ...headers, "Prefer": "return=representation,resolution=merge-duplicates" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save settings");
}

export async function fetchSeasons() {
  const res = await fetch(`${base()}/seasons?order=id.desc`, { headers });
  if (!res.ok) throw new Error("Failed to fetch seasons");
  return res.json();
}
export async function insertSeason(season) {
  const { id, ...data } = season;
  const res = await fetch(`${base()}/seasons`, { method: "POST", headers, body: JSON.stringify(data) });
  if (!res.ok) throw new Error("Failed to insert season");
  return (await res.json())[0];
}
export async function updateSeason(season) {
  const { id, ...data } = season;
  const res = await fetch(`${base()}/seasons?id=eq.${id}`, { method: "PATCH", headers, body: JSON.stringify(data) });
  if (!res.ok) throw new Error("Failed to update season");
  return (await res.json())[0];
}
export async function setActiveSeason(id) {
  await fetch(`${base()}/seasons`, { method: "PATCH", headers, body: JSON.stringify({ is_active: false }) });
  const res = await fetch(`${base()}/seasons?id=eq.${id}`, { method: "PATCH", headers, body: JSON.stringify({ is_active: true }) });
  if (!res.ok) throw new Error("Failed to set active season");
}

export async function fetchPlayers() {
  const res = await fetch(`${base()}/players?order=squad_number.asc`, { headers });
  if (!res.ok) throw new Error("Failed to fetch players");
  return res.json();
}
export async function insertPlayer(player) {
  const { id, ...data } = player;
  const res = await fetch(`${base()}/players`, { method: "POST", headers, body: JSON.stringify(data) });
  if (!res.ok) throw new Error("Failed to insert player");
  return (await res.json())[0];
}
export async function updatePlayer(player) {
  const { id, ...data } = player;
  const res = await fetch(`${base()}/players?id=eq.${id}`, { method: "PATCH", headers, body: JSON.stringify(data) });
  if (!res.ok) throw new Error("Failed to update player");
  return (await res.json())[0];
}
export async function deletePlayer(id) {
  const res = await fetch(`${base()}/players?id=eq.${id}`, { method: "DELETE", headers });
  if (!res.ok) throw new Error("Failed to delete player");
}

export async function fetchAppearances() {
  const res = await fetch(`${base()}/appearances?order=id.desc`, { headers });
  if (!res.ok) throw new Error("Failed to fetch appearances");
  return res.json();
}
export async function insertAppearances(records) {
  const res = await fetch(`${base()}/appearances`, { method: "POST", headers, body: JSON.stringify(records) });
  if (!res.ok) throw new Error("Failed to insert appearances");
  return res.json();
}
export async function deleteAppearancesByResult(resultId) {
  const res = await fetch(`${base()}/appearances?result_id=eq.${resultId}`, { method: "DELETE", headers });
  if (!res.ok) throw new Error("Failed to delete appearances");
}
