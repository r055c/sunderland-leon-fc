// Unofficial league table: pure logic (no React) so it can be tested on its own.

const STOP = new Set(["fc", "afc", "jfc", "cc", "the"]);
const clean = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
const tokens = (s) => clean(s).split(" ").filter((t) => t && !STOP.has(t) && !/^u\d{1,2}s?$/.test(t));
export const normName = (s) => tokens(s).join(" ");

const titleCase = (s) => String(s || "").trim().replace(/\s+/g, " ").replace(/\b([a-z])([a-z']*)/gi, (_, a, b) => a.toUpperCase() + b.toLowerCase());

// Work out which known team a typed name means.
// Returns { name, status } where status is "exact" | "close" | "ambiguous" | "new" | "self".
export function matchTeam(input, teamNames, selfNames = []) {
  const key = normName(input);
  if (!key) return { name: titleCase(input), status: "new", candidates: [] };
  for (const s of selfNames) {
    const sk = normName(s);
    if (sk && (sk === key || sk.split(" ").includes(key) && key.length >= 4)) return { name: s, status: "self", candidates: [] };
  }
  const known = teamNames.map((n) => ({ n, k: normName(n), t: tokens(n) }));
  const exact = known.find((x) => x.k === key);
  if (exact) return { name: exact.n, status: "exact", candidates: [] };
  const it = tokens(input);
  // every word typed appears in the team name ("Gateshead fell" -> "Gateshead Fell Orange")
  let cands = known.filter((x) => it.length && it.every((w) => x.t.includes(w)));
  // or the team name is wholly contained in what was typed ("Hebburn Town Juniors" -> "Hebburn Town")
  if (!cands.length) cands = known.filter((x) => x.t.length && x.t.every((w) => it.includes(w)));
  if (cands.length === 1) return { name: cands[0].n, status: "close", candidates: [] };
  if (cands.length > 1) return { name: titleCase(input), status: "ambiguous", candidates: cands.map((c) => c.n) };
  return { name: titleCase(input), status: "new", candidates: [] };
}

// The app stores logged results with dates like "27 Sept 2026"; league results use "2026-09-27". Turn either into "2026-09-27".
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
export function toISO(d) {
  const s = String(d || "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/(\d{1,2})\s+([A-Za-z]+)\.?,?\s+(\d{4})/);
  const mi = m ? MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()) : -1;
  return m && mi >= 0 ? `${m[3]}-${String(mi + 1).padStart(2, "0")}-${String(+m[1]).padStart(2, "0")}` : "";
}

// Take off chat decoration: "[14/11/2026, 10:32] Name: ", "10:32 - Name: ", "FT", emoji, bullets.
function cleanLine(raw) {
  let s = String(raw || "").replace(/‎|‏/g, "");
  s = s.replace(/^\s*\[?\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4},?\s*\d{1,2}:\d{2}(?::\d{2})?\s*(?:[ap]m)?\]?\s*-?\s*[^:]{1,40}:\s*/i, "");
  s = s.replace(/^\s*\d{1,2}:\d{2}\s*(?:[ap]m)?\s*-\s*[^:]{1,40}:\s*/i, "");
  s = s.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, " ");
  s = s.replace(/^[\s\-•*·>]+/, "").replace(/\b(?:ft|full\s*time|final\s*score|result)\b\s*[:\-]?/gi, " ");
  return s.replace(/\s+/g, " ").trim();
}

// Two layouts are common: "Home 3 - 0 Away" and "Home 3 Away 7".
export function parseLine(raw) {
  const s = cleanLine(raw);
  if (!s) return null;
  let m = s.match(/^(.*?[A-Za-z].*?)\s*(\d{1,2})\s*(?:-|–|—|:|x|v|vs)\s*(\d{1,2})\s*(.*?[A-Za-z].*)$/i);
  if (m) return { home: m[1].trim(), hg: +m[2], ag: +m[3], away: m[4].trim() };
  m = s.match(/^(.*?[A-Za-z].*?)\s+(\d{1,2})\s+(.*?[A-Za-z].*?)\s+(\d{1,2})$/);
  if (m) return { home: m[1].trim(), hg: +m[2], ag: +m[4], away: m[3].trim() };
  return null;
}

// Whole pasted message -> list of rows to preview, plus lines that could not be read.
export function parsePaste(text, teamNames, selfNames = []) {
  const rows = [], skipped = [];
  for (const line of String(text || "").split(/\r?\n/)) {
    if (!line.trim()) continue;
    const p = parseLine(line);
    if (!p || p.hg > 40 || p.ag > 40) { skipped.push(line.trim()); continue; }
    const h = matchTeam(p.home, teamNames, selfNames), a = matchTeam(p.away, teamNames, selfNames);
    rows.push({ home: h.name, away: a.name, hg: p.hg, ag: p.ag, homeStatus: h.status, awayStatus: a.status, homeCands: h.candidates, awayCands: a.candidates, typedHome: p.home, typedAway: p.away });
  }
  return { rows, skipped };
}

// Build the table.
//   matches : [{date, home, away, home_goals, away_goals}]  (entered by hand or pasted)
//   own     : [{date, opposition, homeScore, awayScore}]   (this club's logged league games; our score first)
//   start   : [{team, p, w, d, l, gf, ga, as_of}]          (record up to a date; later games are added on top)
export function computeTable({ matches = [], own = [], start = [], selfName = "" }) {
  const all = [...matches.map((m) => ({ date: m.date || "", home: m.home, away: m.away, hg: +m.home_goals, ag: +m.away_goals }))];
  for (const r of own) {
    if (r.homeScore == null || r.awayScore == null || !r.opposition) continue;
    all.push({ date: toISO(r.date), home: selfName, away: r.opposition, hg: +r.homeScore, ag: +r.awayScore });
  }
  const selfKey = normName(selfName);
  const teams = new Map(); // key -> row
  const row = (name) => {
    const k = normName(name);
    if (!teams.has(k)) teams.set(k, { team: name, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 });
    return teams.get(k);
  };
  const startBy = new Map(start.map((s) => [normName(s.team), s]));
  for (const s of start) {
    const t = row(s.team);
    t.p += +s.p || 0; t.w += +s.w || 0; t.d += +s.d || 0; t.l += +s.l || 0; t.gf += +s.gf || 0; t.ga += +s.ga || 0;
  }
  const credit = (name, f, a, date) => {
    const t = row(name);
    const s = startBy.get(normName(name));
    if (s && s.as_of && date && date <= s.as_of) return; // already inside the opening record
    t.p++; t.gf += f; t.ga += a;
    if (f > a) t.w++; else if (f < a) t.l++; else t.d++;
  };
  for (const m of all) {
    if (!m.home || !m.away || !Number.isFinite(m.hg) || !Number.isFinite(m.ag)) continue;
    credit(m.home, m.hg, m.ag, m.date);
    credit(m.away, m.ag, m.hg, m.date);
  }
  const out = [...teams.values()].map((t) => ({ ...t, gd: t.gf - t.ga, pts: t.w * 3 + t.d, self: normName(t.team) === selfKey }));
  out.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team));
  return out;
}
