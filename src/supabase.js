// src/supabase.js
// Replace these two values with your own from https://supabase.com
// Project Settings → API → Project URL and anon/public key

export const SUPABASE_URL = "https://uofgnoroeghyojddjqhu.supabase.co/rest/v1/";
export const SUPABASE_ANON_KEY = "sb_publishable_QXB6WVq3ZEA8p9oqMA9rAw__AokKXqI";

const headers = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_ANON_KEY,
  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
  "Prefer": "return=representation",
};

const base = () => `${SUPABASE_URL}/rest/v1`;

// ── Results ──────────────────────────────────────────────
export async function fetchResults() {
  const res = await fetch(`${base()}/results?order=date.desc`, { headers });
  if (!res.ok) throw new Error("Failed to fetch results");
  return res.json();
}

export async function insertResult(result) {
  const { id, ...data } = result; // let Supabase generate the id
  const res = await fetch(`${base()}/results`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to insert result");
  const rows = await res.json();
  return rows[0];
}

export async function updateResult(result) {
  const { id, ...data } = result;
  const res = await fetch(`${base()}/results?id=eq.${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update result");
  const rows = await res.json();
  return rows[0];
}

export async function deleteResult(id) {
  const res = await fetch(`${base()}/results?id=eq.${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error("Failed to delete result");
}

// ── Settings (team name, competitions) ───────────────────
export async function fetchSettings() {
  const res = await fetch(`${base()}/settings?id=eq.1`, { headers });
  if (!res.ok) throw new Error("Failed to fetch settings");
  const rows = await res.json();
  return rows[0] || null;
}

export async function upsertSettings(data) {
  const res = await fetch(`${base()}/settings?id=eq.1`, {
    method: "PATCH",
    headers: { ...headers, "Prefer": "return=representation,resolution=merge-duplicates" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save settings");
}
