// Sunderland Leon FC — v2.3
import { useState, useRef, useEffect, useCallback } from "react";
import { fetchResults, insertResult, updateResult, deleteResult, fetchTeams, insertTeam, updateTeam, deleteTeam, fetchSeasons, insertSeason, updateSeason, setActiveSeason, fetchPlayers, insertPlayer, updatePlayer, deletePlayer, fetchAppearances, insertAppearances, deleteAppearancesByResult, uploadImage, fetchMatchPhotos, insertMatchPhotos, deleteMatchPhoto, fetchClubSettings, saveClubSettings } from "./supabase.js";
import { DEFAULT_BADGE } from "./defaultBadge.js";
import { DEFAULT_BRANDING, FONTS, PRESETS, applyBranding, deriveTheme, loadCachedBranding, cacheBranding, contrast } from "./branding.js";

// ── Logo ─────────────────────────────────────────────────

// Club identity — mutable, filled from the club's branding settings at startup.
const BRAND = { name: DEFAULT_BRANDING.club_name, short: DEFAULT_BRANDING.short_name, slogan: DEFAULT_BRANDING.slogan, badge: null };

function ClubLogo({ size = 68 }) {
  const [err, setErr] = useState(false);
  const src = BRAND.badge || DEFAULT_BADGE;
  useEffect(() => { setErr(false); }, [src]);
  if (err) return <span style={{ fontSize: size * 0.6, lineHeight: 1 }}>⚽</span>;
  return <img src={src} alt={BRAND.short} onError={() => setErr(true)} style={{ width: size, height: size, objectFit: "contain", display: "block" }} />;
}

// ── Constants ─────────────────────────────────────────────
// Design tokens — redesign v3 (navy/sky-blue club identity, scoreboard motif)
const THEME = {
  navy: "#12172e",
  navySoft: "#1c2344",
  sky: "#5fb2d9",
  pitch: "#1f6f4a",
  pitchSoft: "#e5f3ec",
  amber: "#e8a93b",
  loss: "#d1495b",
  chalk: "#f4f6f9",
  white: "#ffffff",
  ink60: "#6b7280",
  ink30: "#c7cbd6",
  display: "'Oswald', sans-serif",
  body: "'Work Sans', sans-serif",
  mono: "'IBM Plex Mono', monospace",
};

// Admin PIN — change this to whatever code you want to use to gate the Staff Room.
const ADMIN_PIN = "1966";

// Game types and tournament stages (used when logging a result).
const COMP_TYPES = [
  { key: "league", label: "League", icon: "📋" },
  { key: "cup", label: "Cup", icon: "🏆" },
  { key: "tournament", label: "Tournament", icon: "🎪" },
  { key: "friendly", label: "Friendly", icon: "🤝" },
];
const STAGES = ["Group stage", "Last 16", "Quarter-final", "Semi-final", "3rd place", "Final"];

// Tournament placement options — stored per competition, per season.
const PLACEMENT_OPTIONS = ["Winners", "Runners-up", "3rd Place", "Semi-Final", "Group Stage"];
const PLACEMENT_META = {
  "Winners": { icon: "🏆", bg: "#fdf3d8", color: "#b8860b" },
  "Runners-up": { icon: "🥈", bg: "#eef1f3", color: "#71797e" },
  "3rd Place": { icon: "🥉", bg: "#fbe9d8", color: "#a0522d" },
  "Semi-Final": { icon: "⚔️", bg: THEME.chalk, color: "#6b7280" },
  "Group Stage": { icon: "🏁", bg: THEME.chalk, color: "#6b7280" },
};

// ── Toast ─────────────────────────────────────────────────
function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: THEME.navy, color: THEME.sky, padding: "12px 24px", borderRadius: 30, fontWeight: 800, fontSize: 14, letterSpacing: 1, zIndex: 999, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", whiteSpace: "nowrap", animation: "fadein 0.2s ease" }}>
      {message}
    </div>
  );
}

// ── Share helper ──────────────────────────────────────────
async function shareImage(canvas, filename, text = "") {
  canvas.toBlob(async (blob) => {
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: "image/png" })] })) {
      try {
        await navigator.share({ files: [new File([blob], filename, { type: "image/png" })], title: BRAND.name, text });
        return;
      } catch(e) {}
    }
    // Fallback to download
    const link = document.createElement("a");
    link.download = filename;
    link.href = URL.createObjectURL(blob);
    link.click();
  }, "image/png");
}

// Short caption for sharing a result — used as the native-share text and the WhatsApp message.
function buildResultCaption(match) {
  if (!match) return "";
  const scoreLine = `${BRAND.name.replace(/ FC$/i, "")} ${match.homeScore}-${match.awayScore} ${match.opposition || ""}`.trim();
  const scorers = (match.scorers || []).length ? ` ⚽ ${match.scorers.join(", ")}` : "";
  return `${scoreLine}${scorers}`;
}

const DEFAULT_COMPETITIONS = [];
const INITIAL_RESULTS = [];

function formatDate(str) {
  if (!str) return "";
  try {
    const d = new Date(str);
    if (isNaN(d)) return str; // already formatted e.g. "11 Apr 2026"
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch(e) { return str; }
}
const MEDAL = ["🥇", "🥈", "🥉"];
const COMP_COLORS = ["#87ceeb","#ffd700","#ff7eb3","#90ee90","#ffb347","#dda0dd","#87cefa"];
function getCompColor(comps, comp) { const i = comps.indexOf(comp); const c = COMP_COLORS[(i < 0 ? 0 : i) % COMP_COLORS.length]; return c === COMP_COLORS[0] ? THEME.sky : c; }

// ── Helpers ───────────────────────────────────────────────
function parseScorer(str) {
  const m = str.trim().match(/^(.+?)\s*[×x](\d+)$/);
  if (m) return { name: m[1].trim(), goals: parseInt(m[2]) };
  return { name: str.trim(), goals: 1 };
}
function buildGoalBoard(results) {
  const t = {};
  results.forEach(r => (r.scorers || []).forEach(s => { const { name, goals } = parseScorer(s); t[name] = (t[name] || 0) + goals; }));
  return Object.entries(t).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}
function buildAwardBoard(results, field) {
  const t = {};
  results.forEach(r => { const name = (r[field] || "").trim(); if (name) t[name] = (t[name] || 0) + 1; });
  return Object.entries(t).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

// ── Player Profile ────────────────────────────────────────
function PlayerProfileScreen({ name, players, appearances, results, seasons, ageGroup, onBack, onOpenPlayer }) {
  const stats = getPlayerStats(name, { players, appearances, results, seasons });
  const initials = name.slice(0, 2).toUpperCase();
  const maxSeasonGoals = Math.max(1, ...stats.seasonBreakdown.map(sb => sb.goals));
  const hasRecord = stats.apps > 0;

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: THEME.ink60, fontFamily: THEME.mono, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", padding: "0 0 14px", display: "flex", alignItems: "center", gap: 4 }}>
        ‹ Back
      </button>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
        <div style={{ width: 76, height: 76, borderRadius: "50%", overflow: "hidden", background: THEME.navy, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10, border: `3px solid ${THEME.sky}` }}>
          {stats.player?.photo
            ? <img src={stats.player.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={name} />
            : <span style={{ color: THEME.sky, fontFamily: THEME.display, fontWeight: 600, fontSize: 24 }}>{initials}</span>}
        </div>
        <div style={{ fontFamily: THEME.display, fontWeight: 600, fontSize: 20, color: THEME.navy }}>{name}</div>
        <div style={{ fontFamily: THEME.mono, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: THEME.ink60, marginTop: 2 }}>
          {[ageGroup, stats.player?.squad_number ? `Squad No. ${stats.player.squad_number}` : null].filter(Boolean).join(" · ")}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          { l: "Apps", v: stats.apps, c: THEME.navy },
          { l: "Goals", v: stats.goals, c: THEME.pitch },
          { l: "MOTM", v: stats.motm, c: THEME.amber },
          { l: "Clean Sheets", v: stats.cleanSheets, c: THEME.sky },
        ].map(x => (
          <div key={x.l} style={{ flex: 1, background: THEME.white, borderRadius: 12, padding: "10px 4px", textAlign: "center", boxShadow: "0 2px 8px rgba(18,23,46,0.06)" }}>
            <div style={{ fontFamily: THEME.mono, fontSize: 19, fontWeight: 700, color: x.c }}>{x.v}</div>
            <div style={{ fontSize: 9, color: THEME.ink60, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3 }}>{x.l}</div>
          </div>
        ))}
      </div>

      {hasRecord && (
        <>
          <div style={{ fontFamily: THEME.mono, fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", color: THEME.ink60, marginBottom: 10 }}>Record While Playing</div>
          <div style={{ display: "flex", background: THEME.white, borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(18,23,46,0.06)", marginBottom: 20 }}>
            {[
              { l: "Won", v: stats.wins, c: THEME.pitch },
              { l: "Drawn", v: stats.draws, c: THEME.amber },
              { l: "Lost", v: stats.losses, c: THEME.loss },
            ].map((x, i) => (
              <div key={x.l} style={{ flex: 1, textAlign: "center", padding: "12px 4px", borderLeft: i > 0 ? "1px solid #f0f0f0" : "none" }}>
                <div style={{ fontFamily: THEME.mono, fontSize: 18, fontWeight: 700, color: x.c }}>{x.v}</div>
                <div style={{ fontSize: 9, color: THEME.ink60, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{x.l}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: THEME.ink60, marginTop: -12, marginBottom: 20, lineHeight: 1.5 }}>
            Clean sheets and record are based on matches {name} played in — grassroots squads rotate positions, so this reflects the whole team's result while they were on the pitch, not a fixed defensive role.
          </p>
        </>
      )}

      {stats.seasonBreakdown.length > 0 && (
        <>
          <div style={{ fontFamily: THEME.mono, fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", color: THEME.ink60, marginBottom: 10 }}>Goals by Season</div>
          {stats.seasonBreakdown.map(sb => (
            <div key={sb.season.id} style={{ display: "flex", alignItems: "center", gap: 12, background: THEME.white, borderRadius: 12, padding: "10px 14px", marginBottom: 8, boxShadow: "0 2px 8px rgba(18,23,46,0.05)" }}>
              <div style={{ fontFamily: THEME.display, fontWeight: 600, fontSize: 13, color: THEME.navy, width: 64, flexShrink: 0 }}>{sb.season.name}</div>
              <div style={{ flex: 1, height: 6, background: "#eef0f4", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.round((sb.goals / maxSeasonGoals) * 100)}%`, background: THEME.pitch, borderRadius: 4 }} />
              </div>
              <div style={{ fontFamily: THEME.mono, fontSize: 12, fontWeight: 700, color: THEME.pitch, width: 24, textAlign: "right", flexShrink: 0 }}>{sb.goals}</div>
            </div>
          ))}
        </>
      )}

      {stats.moments.length > 0 && (
        <>
          <div style={{ fontFamily: THEME.mono, fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", color: THEME.ink60, margin: "20px 0 10px" }}>Recent Moments</div>
          {stats.moments.slice(0, 8).map((m, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: THEME.white, borderRadius: 12, padding: "10px 14px", marginBottom: 8, boxShadow: "0 2px 8px rgba(18,23,46,0.05)" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{m.type === "motm" ? "⭐" : "⚽"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: THEME.navy, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.type === "motm" ? "Man of the Match" : m.goals > 1 ? `${m.goals} goals` : "Goal"} vs {m.result.opposition}
                </div>
                <div style={{ fontFamily: THEME.mono, fontSize: 9, color: THEME.ink60, marginTop: 1 }}>{m.result.date}</div>
              </div>
            </div>
          ))}
        </>
      )}

      {stats.apps === 0 && stats.goals === 0 && stats.motm === 0 && (
        <div style={{ textAlign: "center", padding: "30px 20px", color: THEME.ink30 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>⚽</div>
          <div style={{ fontSize: 13, color: THEME.ink60 }}>No stats logged for {name} yet.</div>
        </div>
      )}
    </div>
  );
}


// Clean sheets and W/D/L are derived from appearances (who was on the pitch)
// joined against results — no extra data entry required.
function getPlayerStats(name, { players, appearances, results, seasons }) {
  const player = players.find(p => p.name === name) || null;
  const appResults = player
    ? appearances.filter(a => a.player_id === player.id).map(a => results.find(r => r.id === a.result_id)).filter(Boolean)
    : [];

  const wins = appResults.filter(r => r.result === "W").length;
  const draws = appResults.filter(r => r.result === "D").length;
  const losses = appResults.filter(r => r.result === "L").length;
  const cleanSheets = appResults.filter(r => Number(r.awayScore) === 0).length;

  let totalGoals = 0;
  const moments = [];
  results.forEach(r => {
    (r.scorers || []).forEach(s => {
      const { name: sName, goals } = parseScorer(s);
      if (sName === name) { totalGoals += goals; moments.push({ result: r, type: "goal", goals }); }
    });
    if ((r.motm || "").trim() === name) moments.push({ result: r, type: "motm" });
  });
  moments.sort((a, b) => new Date(b.result.date) - new Date(a.result.date));

  const seasonBreakdown = seasons.map(s => {
    let goals = 0;
    results.filter(r => r.season_id === s.id).forEach(r => (r.scorers || []).forEach(sc => {
      const { name: n, goals: g } = parseScorer(sc);
      if (n === name) goals += g;
    }));
    return { season: s, goals };
  }).filter(sb => sb.goals > 0);

  return {
    player,
    apps: appResults.length,
    goals: totalGoals,
    motm: results.filter(r => (r.motm || "").trim() === name).length,
    cleanSheets,
    wins, draws, losses,
    moments,
    seasonBreakdown,
  };
}


// ── Save card as image ────────────────────────────────────
function loadHtml2Canvas() {
  return new Promise((resolve, reject) => {
    if (window.html2canvas) { resolve(window.html2canvas); return; }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    script.onload = () => resolve(window.html2canvas);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}
function SaveCardButton({ cardRef, filename = "leon-result.png", onSaved, shareText = "" }) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(false);
  const handleSave = async () => {
    if (!cardRef.current) return;
    setSaving(true); setErr(false);
    try {
      const h2c = await loadHtml2Canvas();
      const canvas = await h2c(cardRef.current, { backgroundColor: "#ffffff", scale: 3, useCORS: true, logging: false, allowTaint: true });
      await shareImage(canvas, filename, shareText);
      if (onSaved) onSaved();
    } catch(e) { setErr(true); }
    setSaving(false);
  };
  const handleWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText || BRAND.name)}`;
    window.open(url, "_blank", "noopener");
  };
  const canShare = typeof navigator !== "undefined" && !!navigator.share;
  return (
    <div style={{ marginTop: 12 }}>
      <button onClick={handleSave} disabled={saving}
        style={{ width: "100%", padding: "14px", background: "#1877f2", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 800, letterSpacing: 1, cursor: saving ? "wait" : "pointer", fontFamily: "inherit", textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: saving ? 0.7 : 1 }}>
        {saving ? "⏳ Saving..." : canShare ? "📤 Share Result Card" : "📸 Save as Image"}
      </button>
      {err && <p style={{ textAlign: "center", color: "#d50000", fontSize: 12, marginTop: 6 }}>Couldn't share — try a screenshot instead.</p>}
      {shareText && (
        <button onClick={handleWhatsApp}
          style={{ width: "100%", marginTop: 8, padding: "11px", background: "#25D366", color: "#fff", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 800, letterSpacing: 0.5, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          💬 Share to WhatsApp
        </button>
      )}
    </div>
  );
}

// ── Leaderboard ───────────────────────────────────────────
function Leaderboard({ data, label, emptyMsg, filterLabel, accentColor = THEME.sky, onRowClick }) {
  const max = data[0]?.count || 1;
  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#888", letterSpacing: 2, textTransform: "uppercase" }}>{filterLabel} — {label}</span>
      </div>
      {data.length === 0
        ? <p style={{ textAlign: "center", color: "#bbb", fontSize: 15, marginTop: 20 }}>{emptyMsg}</p>
        : (
          <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "36px 1fr 100px 48px", padding: "10px 18px", background: "#f7f8fa", borderBottom: "2px solid #e8e8e8" }}>
              {["#","NAME","",""].map((h,i) => <span key={i} style={{ fontSize: 10, fontWeight: 800, color: "#aaa", letterSpacing: 2 }}>{h}</span>)}
            </div>
            {data.map((p, i) => (
              <div key={p.name} onClick={() => onRowClick && onRowClick(p.name)} style={{ display: "grid", gridTemplateColumns: "36px 1fr 100px 48px", alignItems: "center", padding: "13px 18px", borderBottom: i < data.length - 1 ? "1px solid #f0f0f0" : "none", background: i === 0 ? "#fffbea" : "#fff", cursor: onRowClick ? "pointer" : "default" }}>
                <span style={{ fontSize: i < 3 ? 20 : 13, fontWeight: 800, color: i >= 3 ? "#bbb" : undefined }}>{i < 3 ? MEDAL[i] : i + 1}</span>
                <span style={{ fontSize: 17, fontWeight: 800, color: THEME.navy }}>{p.name}</span>
                <div style={{ paddingRight: 10 }}>
                  <div style={{ height: 8, background: "#eee", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.round((p.count / max) * 100)}%`, background: i === 0 ? `linear-gradient(90deg,${accentColor},#1a9be8)` : i === 1 ? "linear-gradient(90deg,#b0bec5,#607d8b)" : i === 2 ? "linear-gradient(90deg,#ffcc80,#ff9800)" : "#ddd", borderRadius: 4 }} />
                  </div>
                </div>
                <span style={{ fontSize: 20, fontWeight: 900, color: THEME.navy, textAlign: "right" }}>{p.count}</span>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

// ── Result Card ───────────────────────────────────────────
// ── Scoreboard card (signature element) ────────────────────
function ScoreCard({ match, compColor = THEME.sky, onClick, showMeta = true, photoCount = 0 }) {
  const isWin = match.result === "W", isLoss = match.result === "L";
  const resultBg = isWin ? "#4ade80" : isLoss ? "#f3a3ad" : "#e8a93b";
  const resultLabel = isWin ? "WIN" : isLoss ? "LOSS" : "DRAW";
  return (
    <button onClick={onClick} style={{ width: "100%", textAlign: "left", background: THEME.navy, border: "none", borderRadius: 16, padding: "16px 18px", marginBottom: 12, cursor: onClick ? "pointer" : "default", position: "relative", overflow: "hidden", fontFamily: THEME.body }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${compColor}, transparent)` }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontFamily: THEME.mono, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: compColor }}>{match.competition}</span>
        <span style={{ fontFamily: THEME.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: "3px 9px", borderRadius: 6, color: THEME.navy, background: resultBg }}>{resultLabel}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ flex: 1, textAlign: "center" }}>
          <span style={{ fontFamily: THEME.mono, fontWeight: 700, fontSize: 30, color: "#fff", background: THEME.navySoft, borderRadius: 8, padding: "2px 12px", display: "inline-block", minWidth: 40 }}>{match.homeScore}</span>
          <div style={{ fontFamily: THEME.display, fontSize: 11, color: "#fff", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginTop: 6 }}>{BRAND.name.replace(/ FC$/i, "")}</div>
        </div>
        <span style={{ color: compColor, fontFamily: THEME.mono, fontSize: 18, margin: "0 6px" }}>–</span>
        <div style={{ flex: 1, textAlign: "center" }}>
          <span style={{ fontFamily: THEME.mono, fontWeight: 700, fontSize: 30, color: "#fff", background: THEME.navySoft, borderRadius: 8, padding: "2px 12px", display: "inline-block", minWidth: 40 }}>{match.awayScore}</span>
          <div style={{ fontFamily: THEME.display, fontSize: 11, color: "#c6cbe0", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginTop: 6 }}>{(match.opposition || "").toUpperCase()}</div>
        </div>
      </div>
      {showMeta && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {match.motm && <span style={{ fontFamily: THEME.mono, fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: "#e8a93b" }}>⭐ {match.motm}</span>}
          {(match.scorers || []).length > 0 && <span style={{ fontFamily: THEME.mono, fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: "#e8a93b" }}>⚽ {match.scorers.join(", ")}</span>}
          {match.round && <span style={{ fontFamily: THEME.mono, fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: "#8b91ad" }}>{match.round}</span>}
          {photoCount > 0 && <span style={{ fontFamily: THEME.mono, fontSize: 9, letterSpacing: 1, color: THEME.sky }}>📷 {photoCount}</span>}
          <span style={{ fontFamily: THEME.mono, fontSize: 9, color: "#6b7191", marginLeft: "auto" }}>{match.date}</span>
        </div>
      )}
    </button>
  );
}

function ResultCard({ match, teamName = "Team", compColor = THEME.sky, players = [], teams = [], onOpenPlayer }) {
  const isWin = match.result === "W", isLoss = match.result === "L";
  const pillBg = isWin ? THEME.pitch : isLoss ? THEME.loss : THEME.amber;
  const resultLabel = isWin ? "WIN" : isLoss ? "LOSS" : "DRAW";
  const cardRef = useRef();
  const filename = `leon-vs-${(match.opposition || "result").replace(/\s+/g,"-").toLowerCase()}.png`;
  // Prefer the logo saved on the result itself; if it wasn't set at the time (e.g. the
  // logo was added to the team afterwards), fall back to the team's current logo.
  const displayLogo = match.oppLogo || teams.find(t => t.name === match.opposition)?.logo || null;
  return (
    <div>
      <div ref={cardRef} style={{ background: THEME.white, borderRadius: 18, overflow: "hidden", boxShadow: "0 4px 24px rgba(18,23,46,0.12)", width: "100%", maxWidth: 520, margin: "0 auto", fontFamily: THEME.body, border: "1px solid #eef0f4" }}>
        <div style={{ background: THEME.navy, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: THEME.white, fontFamily: THEME.display, fontWeight: 600, fontSize: "clamp(12px,3.4vw,14px)", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{match.competition}</div>
            {match.round && <div style={{ color: THEME.sky, fontFamily: THEME.mono, fontSize: 9, letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>{match.round}</div>}
          </div>
          <span style={{ fontFamily: THEME.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: "5px 12px", borderRadius: 20, background: pillBg, color: THEME.white, flexShrink: 0, whiteSpace: "nowrap" }}>{resultLabel}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 12px 16px", gap: 6 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "1 1 0", minWidth: 0, gap: 8 }}>
            <div style={{ background: THEME.chalk, border: "2px solid #eef0f4", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", width: "clamp(48px,17vw,64px)", height: "clamp(48px,17vw,64px)", flexShrink: 0 }}>
              <ClubLogo size={38} />
            </div>
            <span style={{ fontSize: "clamp(9px,2.8vw,12px)", fontWeight: 600, color: THEME.navy, textAlign: "center", lineHeight: 1.2, fontFamily: THEME.display, textTransform: "uppercase" }}>{BRAND.name.replace(/ FC$/i, "")}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "0 0 auto", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "clamp(6px,2vw,10px)" }}>
              <span style={{ fontFamily: THEME.mono, fontSize: "clamp(26px,8vw,40px)", fontWeight: 700, color: THEME.navy, lineHeight: 1 }}>{match.homeScore}</span>
              <span style={{ fontFamily: THEME.mono, fontSize: "clamp(16px,4.5vw,22px)", color: THEME.ink30 }}>–</span>
              <span style={{ fontFamily: THEME.mono, fontSize: "clamp(26px,8vw,40px)", fontWeight: 700, color: THEME.navy, lineHeight: 1 }}>{match.awayScore}</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "1 1 0", minWidth: 0, gap: 8 }}>
            <div style={{ background: THEME.chalk, border: "2px solid #eef0f4", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", width: "clamp(48px,17vw,64px)", height: "clamp(48px,17vw,64px)", flexShrink: 0 }}>
              {displayLogo ? <img src={displayLogo} alt={match.opposition} style={{ width: "clamp(30px,13vw,52px)", height: "clamp(30px,13vw,52px)", objectFit: "contain" }} /> : <span style={{ fontSize: "clamp(18px,6vw,26px)" }}>⚽</span>}
            </div>
            <span style={{ fontSize: "clamp(9px,2.8vw,12px)", fontWeight: 600, color: THEME.navy, textAlign: "center", lineHeight: 1.2, fontFamily: THEME.display, textTransform: "uppercase", wordBreak: "break-word" }}>{(match.opposition || "").toUpperCase()}</span>
          </div>
        </div>

        {(match.scorers || []).length > 0 && (
          <>
            <div style={{ height: 1, background: "#eee", margin: "0 18px" }} />
            <div style={{ padding: "12px 18px" }}>
              <span style={{ fontFamily: THEME.mono, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: THEME.skyInk, display: "block", marginBottom: 8 }}>Goal Scorers</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {match.scorers.map((scorer, i) => {
                  const name = scorer.replace(/\s*[×x]\d+$/, "").trim();
                  const player = players.find(p => p.name === name);
                  return (
                    <div key={i} onClick={() => onOpenPlayer && onOpenPlayer(name)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: onOpenPlayer ? "pointer" : "default" }}>
                      {player?.photo ? (
                        <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: `2px solid ${THEME.sky}` }}>
                          <img src={player.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={name} />
                        </div>
                      ) : (
                        <span style={{ fontSize: 15 }}>⚽</span>
                      )}
                      <span style={{ fontFamily: THEME.body, fontSize: 13, fontWeight: 700, color: THEME.navy }}>{player?.squad_number ? `#${player.squad_number} ` : ""}{scorer}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {(match.motm || match.oppMotm) && (
          <>
            <div style={{ height: 1, background: "#eee", margin: "0 18px" }} />
            <div style={{ padding: "12px 18px", display: "flex", gap: 20, flexWrap: "wrap" }}>
              {match.motm && (() => {
                const player = players.find(p => p.name === match.motm);
                return (
                  <div onClick={() => onOpenPlayer && onOpenPlayer(match.motm)} style={{ display: "flex", alignItems: "center", gap: 10, cursor: onOpenPlayer ? "pointer" : "default" }}>
                    {player?.photo ? (
                      <div style={{ width: 38, height: 38, borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: `2px solid ${THEME.amber}` }}>
                        <img src={player.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={match.motm} />
                      </div>
                    ) : (
                      <div style={{ width: 38, height: 38, borderRadius: "50%", background: THEME.navy, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `2px solid ${THEME.amber}` }}>
                        <span style={{ color: THEME.amber, fontSize: 11, fontWeight: 700, fontFamily: THEME.display }}>{match.motm.slice(0,2).toUpperCase()}</span>
                      </div>
                    )}
                    <div>
                      <span style={{ fontFamily: THEME.mono, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: THEME.sky, display: "block", marginBottom: 2 }}>Man of the Match</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: THEME.navy }}>{match.motm}</span>
                    </div>
                  </div>
                );
              })()}
              {match.oppMotm && (() => {
                const player = players.find(p => p.name === match.oppMotm);
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {player?.photo ? (
                      <div style={{ width: 38, height: 38, borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: "2px solid #ff7eb3" }}>
                        <img src={player.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={match.oppMotm} />
                      </div>
                    ) : (
                      <div style={{ width: 38, height: 38, borderRadius: "50%", background: THEME.chalk, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "2px solid #ff7eb3" }}>
                        <span style={{ color: "#ff7eb3", fontSize: 11, fontWeight: 700, fontFamily: THEME.display }}>{match.oppMotm.slice(0,2).toUpperCase()}</span>
                      </div>
                    )}
                    <div>
                      <span style={{ fontFamily: THEME.mono, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: THEME.ink60, display: "block", marginBottom: 2 }}>Opp. Man of Match</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink60 }}>{match.oppMotm}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </>
        )}

        <div style={{ background: THEME.chalk, padding: "10px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #eee" }}>
          <span style={{ fontFamily: THEME.mono, fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: THEME.ink60 }}>{BRAND.name}{teamName ? ` · ${teamName}` : ""}</span>
          <span style={{ fontFamily: THEME.mono, fontSize: 9, color: THEME.ink60 }}>{match.date}</span>
        </div>
      </div>
      <SaveCardButton cardRef={cardRef} filename={filename} shareText={buildResultCaption(match)} />
    </div>
  );
}

// ── Team picker with search ───────────────────────────────
function TeamPicker({ teams, value, onChange, onAddNew }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = teams.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
  const selected = teams.find(t => t.name === value);
  return (
    <div style={{ position: "relative" }}>
      <div onClick={() => setOpen(o => !o)} style={{ border: "2px solid #e8e8e8", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {selected?.logo ? <img src={selected.logo} style={{ width: 28, height: 28, objectFit: "contain" }} alt="" /> : <span style={{ fontSize: 22 }}>⚽</span>}
          <span style={{ fontSize: 16, fontWeight: 600, color: value ? THEME.navy : "#aaa", fontFamily: "inherit" }}>{value || "Select opposition..."}</span>
        </div>
        <span style={{ color: "#aaa" }}>▼</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "110%", left: 0, right: 0, background: "#fff", border: "2px solid #e8e8e8", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 50, maxHeight: 280, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>
            <input autoFocus placeholder="Search teams..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", border: "1.5px solid #e8e8e8", borderRadius: 8, padding: "8px 12px", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.map(t => (
              <div key={t.id} onClick={() => { onChange(t.name); setSearch(""); setOpen(false); }}
                style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", background: t.name === value ? "#f0f4ff" : "#fff", borderBottom: "1px solid #f8f8f8" }}>
                {t.logo ? <img src={t.logo} style={{ width: 32, height: 32, objectFit: "contain" }} alt="" /> : <span style={{ fontSize: 24 }}>⚽</span>}
                <span style={{ fontSize: 15, fontWeight: 700, color: THEME.navy, fontFamily: "inherit" }}>{t.name}</span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: 16, textAlign: "center", color: "#bbb", fontSize: 14 }}>No teams found</div>
            )}
          </div>
          <div onClick={() => { onAddNew(search); setOpen(false); }}
            style={{ padding: "12px 16px", borderTop: "2px solid #f0f0f0", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: THEME.sky, fontWeight: 800, fontSize: 14, fontFamily: "inherit" }}>
            <span>+</span> Add "{search || "new team"}" to list
          </div>
        </div>
      )}
    </div>
  );
}

// ── Branding screen (Admin) ───────────────────────────────
function BrandingScreen({ branding, onSave, onBack, showToast }) {
  const [d, setD] = useState({ ...branding });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef();
  const t = deriveTheme(d);
  const set = (k, v) => setD(x => ({ ...x, [k]: v }));
  const lab = { fontFamily: THEME.mono, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: THEME.ink60, margin: "20px 0 8px", display: "block" };
  const inp = { width: "100%", boxSizing: "border-box", padding: "11px 12px", borderRadius: 10, border: `1.5px solid ${THEME.ink30}`, fontSize: 14, fontFamily: "inherit", background: THEME.white, color: THEME.navy };
  const card = { background: THEME.white, borderRadius: 14, padding: 14, boxShadow: "0 2px 8px rgba(18,23,46,0.06)" };
  const lightAccent = contrast(d.accent_color, "#ffffff") < 4.5;
  const mainDarkened = t.navy.toLowerCase() !== (d.primary_color || "").toLowerCase();
  const name = (d.club_name || "").trim() || "Your Club FC";
  const short = (d.short_name || "").trim() || "Club";

  const pickBadge = async e => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    setUploading(true);
    try { set("badge_url", await uploadImage(file, "branding")); } catch (err) { showToast("Badge upload failed"); }
    setUploading(false);
  };
  const save = async () => {
    setBusy(true);
    try { await onSave({ ...d, club_name: name, short_name: short, slogan: (d.slogan || "").trim() }); showToast("Branding saved ✓"); }
    catch (err) { showToast("Could not save branding"); }
    setBusy(false);
  };

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", paddingBottom: 30 }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: THEME.ink60, fontFamily: THEME.mono, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", padding: "0 0 14px" }}>‹ Back</button>
      <div style={{ fontFamily: THEME.display, fontWeight: 600, fontSize: 18, color: THEME.navy }}>Club branding</div>

      {/* Live preview */}
      <span style={lab}>Preview</span>
      <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 18px rgba(18,23,46,0.15)", background: t.chalk }}>
        <div style={{ background: t.navy, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src={d.badge_url || DEFAULT_BADGE} alt="" style={{ width: 44, height: 44, objectFit: "contain" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#fff", fontFamily: t.display, fontWeight: 600, fontSize: 17, lineHeight: 1.1 }}>{name}</div>
            <div style={{ color: t.sky, fontFamily: t.body, fontSize: 11, marginTop: 3 }}>{d.slogan}</div>
          </div>
        </div>
        <div style={{ padding: 14 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderLeft: "4px solid #1f6f4a" }}>
            <div>
              <div style={{ fontFamily: t.body, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: t.skyInk, fontWeight: 700 }}>League</div>
              <div style={{ fontFamily: t.body, fontSize: 14, color: t.navy, fontWeight: 600 }}>{short} v Rovers</div>
            </div>
            <div style={{ background: t.navy, color: "#fff", fontFamily: t.display, fontSize: 18, padding: "4px 12px", borderRadius: 8 }}>3 – 1</div>
          </div>
          <button style={{ marginTop: 10, background: t.sky, color: t.onSky, border: "none", borderRadius: 10, padding: "9px 16px", fontFamily: t.body, fontWeight: 700, fontSize: 13 }}>Share result</button>
        </div>
      </div>
      {(lightAccent || mainDarkened) && (
        <div style={{ fontSize: 11, color: THEME.ink60, marginTop: 8, lineHeight: 1.4 }}>
          {lightAccent && "Your highlight colour is light, so a darker shade is used for text on white. "}
          {mainDarkened && "Your main colour was darkened slightly so white text stays readable."}
        </div>
      )}

      <span style={lab}>Colour presets</span>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {PRESETS.map(p => {
          const sel = p.p.toLowerCase() === (d.primary_color || "").toLowerCase() && p.a.toLowerCase() === (d.accent_color || "").toLowerCase();
          return (
            <button key={p.n} onClick={() => setD(x => ({ ...x, primary_color: p.p, accent_color: p.a }))}
              style={{ ...card, padding: 10, display: "flex", alignItems: "center", gap: 10, border: sel ? `2px solid ${THEME.skyInk}` : "2px solid transparent", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
              <span style={{ display: "flex", flexShrink: 0 }}>
                <span style={{ width: 18, height: 28, background: p.p, borderRadius: "6px 0 0 6px" }} />
                <span style={{ width: 18, height: 28, background: p.a, borderRadius: "0 6px 6px 0" }} />
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: THEME.navy }}>{p.n}</span>
            </button>
          );
        })}
      </div>

      <span style={lab}>Custom colours</span>
      <div style={{ ...card, display: "flex", gap: 16 }}>
        {[["primary_color", "Main colour"], ["accent_color", "Highlight"]].map(([k, l]) => (
          <label key={k} style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: THEME.navy, fontWeight: 600 }}>
            <input type="color" value={d[k]} onChange={e => set(k, e.target.value)} style={{ width: 44, height: 36, border: "none", padding: 0, background: "none" }} />
            {l}
          </label>
        ))}
      </div>

      <span style={lab}>Club badge</span>
      <div style={{ ...card, display: "flex", alignItems: "center", gap: 12 }}>
        <img src={d.badge_url || DEFAULT_BADGE} alt="" style={{ width: 52, height: 52, objectFit: "contain" }} />
        <div style={{ flex: 1, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => fileInput.current?.click()} disabled={uploading} style={{ background: THEME.navy, color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{uploading ? "Uploading…" : "Upload badge"}</button>
          {d.badge_url && <button onClick={() => set("badge_url", null)} style={{ background: "none", border: `1.5px solid ${THEME.ink30}`, borderRadius: 10, padding: "9px 14px", fontSize: 12, color: THEME.ink60, cursor: "pointer" }}>Use default</button>}
        </div>
        <input ref={fileInput} type="file" accept="image/*" onChange={pickBadge} style={{ display: "none" }} />
      </div>

      <span style={lab}>Club name</span>
      <input style={inp} value={d.club_name} onChange={e => set("club_name", e.target.value)} placeholder="e.g. Sunderland Leon FC" />
      <span style={lab}>Short name</span>
      <input style={inp} value={d.short_name} onChange={e => set("short_name", e.target.value)} placeholder="e.g. Leon FC" />
      <span style={lab}>Slogan</span>
      <input style={inp} value={d.slogan} onChange={e => set("slogan", e.target.value)} placeholder="Your club motto" />

      <span style={lab}>Font style</span>
      <div style={{ display: "grid", gap: 8 }}>
        {FONTS.map(f => (
          <button key={f.id} onClick={() => set("font_pairing", f.id)}
            style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", border: d.font_pairing === f.id ? `2px solid ${THEME.skyInk}` : "2px solid transparent", cursor: "pointer", fontFamily: "inherit" }}>
            <span style={{ fontFamily: f.display, fontSize: 20, color: THEME.navy }}>{f.sample}</span>
            <span style={{ fontSize: 11, color: THEME.ink60 }}>{f.name}</span>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
        <button onClick={() => setD({ ...DEFAULT_BRANDING })} style={{ flex: 1, background: "none", border: `1.5px solid ${THEME.ink30}`, borderRadius: 12, padding: 13, fontWeight: 700, fontSize: 13, color: THEME.ink60, cursor: "pointer" }}>Reset to defaults</button>
        <button onClick={save} disabled={busy} style={{ flex: 2, background: THEME.navy, color: "#fff", border: "none", borderRadius: 12, padding: 13, fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>{busy ? "Saving…" : "Save branding"}</button>
      </div>
      <div style={{ fontSize: 11, color: THEME.ink60, marginTop: 12, lineHeight: 1.4 }}>Changes apply to everyone who opens the app. The home-screen icon and installed app name are fixed when the app is built.</div>
    </div>
  );
}

// ── Head-to-head (public) ─────────────────────────────────
function H2HPanel({ results, competitions }) {
  const [q, setQ] = useState("");
  const [team, setTeam] = useState(null);
  const names = [...new Set(results.map(r => (r.opposition || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const matches = q.trim() ? names.filter(n => n.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 6) : [];
  const games = team ? results.filter(r => (r.opposition || "").trim().toLowerCase() === team.toLowerCase())
    .sort((a, b) => new Date(b.date) - new Date(a.date)) : [];
  const count = k => games.filter(r => r.result === k).length;
  const gf = games.reduce((a, r) => a + (r.homeScore || 0), 0), ga = games.reduce((a, r) => a + (r.awayScore || 0), 0);
  const col = r => r === "W" ? "#00c853" : r === "L" ? "#d50000" : "#ffab00";
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ position: "relative" }}>
        <input type="text" placeholder="🔍 Head-to-head — search an opponent…" value={q}
          onChange={e => { setQ(e.target.value); setTeam(null); }}
          style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 12, border: `1.5px solid ${THEME.ink30}`, fontSize: 14, fontFamily: "inherit", background: "#fff", color: THEME.navy }} />
        {!team && matches.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 12, marginTop: 6, boxShadow: "0 4px 16px rgba(18,23,46,0.12)", overflow: "hidden" }}>
            {matches.map(n => (
              <button key={n} onClick={() => { setTeam(n); setQ(n); }}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "11px 14px", border: "none", borderBottom: "1px solid #f0f0f0", background: "none", fontSize: 14, color: THEME.navy, cursor: "pointer", fontFamily: "inherit" }}>{n}</button>
            ))}
          </div>
        )}
      </div>
      {team && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontFamily: THEME.mono, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: THEME.ink60, marginBottom: 10 }}>Head-to-head · {team}</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 12, flexWrap: "wrap" }}>
            {[["Played", games.length, THEME.navy], ["Won", count("W"), "#00c853"], ["Drawn", count("D"), "#ffab00"], ["Lost", count("L"), "#d50000"], ["Goals", `${gf}–${ga}`, THEME.skyInk]].map(([l, v, c]) => (
              <div key={l} style={{ background: "#fff", borderRadius: 12, padding: "8px 14px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", borderBottom: `3px solid ${c}`, minWidth: 58 }}>
                <div style={{ fontSize: 19, fontWeight: 900, color: c }}>{v}</div>
                <div style={{ fontSize: 10, color: "#999", fontWeight: 700 }}>{l.toUpperCase()}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {games.map(m => (
              <div key={m.id} style={{ background: "#fff", borderRadius: 12, padding: "11px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", borderLeft: `4px solid ${col(m.result)}` }}>
                <span style={{ background: col(m.result), color: "#fff", fontWeight: 800, fontSize: 13, borderRadius: 8, padding: "3px 8px" }}>{m.result}</span>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: THEME.navy }}>{m.homeScore}–{m.awayScore}</span>
                <span style={{ fontSize: 12, color: "#aaa" }}>{m.date}</span>
                <span style={{ fontSize: 11, color: getCompColor(competitions, m.competition), fontWeight: 700, background: "#f5f5f5", borderRadius: 8, padding: "2px 8px" }}>{m.competition}</span>
              </div>
            ))}
          </div>
          <button onClick={() => { setTeam(null); setQ(""); }} style={{ marginTop: 10, background: "none", border: "1.5px solid #e0e0e0", borderRadius: 10, padding: 10, width: "100%", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13, color: "#888" }}>Clear</button>
        </div>
      )}
    </div>
  );
}

// A tournament game that was half-entered when the app was closed.
const TOUR_DRAFT = (() => { try { return localStorage.getItem("leon_tour_day") ? JSON.parse(localStorage.getItem("leon_tour_draft") || "null") : null; } catch (e) { return null; } })();

// ── Tournament summary card (shareable image) ─────────────
function TournamentCard({ cardRef, name, date, placement, games, players }) {
  const w = games.filter(g => g.result === "W").length, d = games.filter(g => g.result === "D").length, l = games.filter(g => g.result === "L").length;
  const gf = games.reduce((a, g) => a + (g.homeScore || 0), 0), ga = games.reduce((a, g) => a + (g.awayScore || 0), 0);
  const tally = {};
  games.forEach(g => (g.scorers || []).forEach(sc => { const { name: n, goals } = parseScorer(sc); tally[n] = (tally[n] || 0) + goals; }));
  const top = Object.entries(tally).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5);
  const meta = PLACEMENT_META[placement] || null;
  const col = r => r === "W" ? "#00c853" : r === "L" ? "#d50000" : "#ffab00";
  return (
    <div ref={cardRef} style={{ background: THEME.white, borderRadius: 18, overflow: "hidden", boxShadow: "0 4px 24px rgba(18,23,46,0.12)", width: "100%", maxWidth: 360, margin: "0 auto" }}>
      <div style={{ background: THEME.navy, padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}>
        <ClubLogo size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "#fff", fontFamily: THEME.display, fontWeight: 600, fontSize: 16, lineHeight: 1.15 }}>{name}</div>
          <div style={{ color: THEME.sky, fontFamily: THEME.mono, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginTop: 3 }}>{date} · {BRAND.name}</div>
        </div>
      </div>
      <div style={{ textAlign: "center", padding: "18px 16px 8px" }}>
        {meta ? (<><div style={{ fontSize: 40 }}>{meta.icon}</div><div style={{ fontFamily: THEME.display, fontWeight: 600, fontSize: 22, color: THEME.navy }}>{placement}</div></>) : <div style={{ fontFamily: THEME.display, fontWeight: 600, fontSize: 20, color: THEME.navy }}>Tournament report</div>}
      </div>
      <div style={{ display: "flex", gap: 8, padding: "8px 16px 12px" }}>
        {[["P", games.length, THEME.navy], ["W", w, "#00c853"], ["D", d, "#ffab00"], ["L", l, "#d50000"], ["GF–GA", `${gf}–${ga}`, THEME.skyInk]].map(([k, v, c]) => (
          <div key={k} style={{ flex: 1, textAlign: "center", background: THEME.chalk, borderRadius: 10, padding: "7px 2px", borderBottom: `3px solid ${c}` }}>
            <div style={{ fontWeight: 900, fontSize: 16, color: c }}>{v}</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#999" }}>{k}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: "0 16px 6px" }}>
        {games.map(g => (
          <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: "1px solid #f0f0f0", fontSize: 12.5 }}>
            <span style={{ width: 18, height: 18, borderRadius: 5, background: col(g.result), color: "#fff", fontWeight: 800, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>{g.result}</span>
            <span style={{ flex: 1, fontWeight: 600, color: THEME.navy }}>{g.opposition}</span>
            <span style={{ color: "#999", fontSize: 10.5 }}>{g.round}</span>
            <span style={{ fontWeight: 800, color: THEME.navy }}>{g.homeScore}–{g.awayScore}</span>
          </div>
        ))}
      </div>
      {top.length > 0 && (
        <div style={{ padding: "8px 16px 12px" }}>
          <div style={{ fontFamily: THEME.mono, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: THEME.skyInk, fontWeight: 700, marginBottom: 4 }}>⚽ Top scorers</div>
          {top.map(([n, g], i) => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", fontSize: 12.5 }}>
              <span style={{ width: 16, color: "#aaa", fontWeight: 700 }}>{i + 1}</span>
              <span style={{ flex: 1, fontWeight: 600, color: THEME.navy }}>{n}</span>
              <span style={{ fontWeight: 800, color: THEME.navy }}>{g}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ background: THEME.chalk, padding: "9px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: THEME.skyInk, fontSize: 10, fontWeight: 700, letterSpacing: 2 }}>{BRAND.short.toUpperCase()}</span>
        <span style={{ color: "#aaa", fontSize: 9, letterSpacing: 1 }}>{BRAND.slogan.toUpperCase()}</span>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────
export default function App() {
  const [branding, setBranding] = useState(() => loadCachedBranding());
  applyBranding(THEME, branding);
  BRAND.name = branding.club_name || DEFAULT_BRANDING.club_name;
  BRAND.short = branding.short_name || DEFAULT_BRANDING.short_name;
  BRAND.slogan = branding.slogan ?? "";
  BRAND.badge = branding.badge_url || null;
  useEffect(() => {
    document.title = BRAND.name;
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", THEME.navy);
    document.body.style.fontFamily = THEME.body;
  }, [branding]);
  const [mode, setMode] = useState("home");
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewingPlayerName, setViewingPlayerName] = useState(null);
  const [playerProfileFrom, setPlayerProfileFrom] = useState("scorers");
  const [showPinGate, setShowPinGate] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (msg) => {
    setToast(msg);
    // Small haptic buzz on save confirmations, where supported (most Android phones; no-op on iOS Safari).
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(35); } catch (e) {}
    }
  };

  // ── Install prompt (Add to Home Screen) ─────────────────
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPromptEvent(e);
      const dismissed = localStorage.getItem("leon_install_dismissed");
      const isStandalone = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
      if (!dismissed && !isStandalone) setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  const handleInstallClick = async () => {
    if (!installPromptEvent) return;
    installPromptEvent.prompt();
    try { await installPromptEvent.userChoice; } catch (e) {}
    setShowInstallBanner(false);
    setInstallPromptEvent(null);
  };
  const handleDismissInstall = () => {
    setShowInstallBanner(false);
    localStorage.setItem("leon_install_dismissed", "1");
  };
  const [scorersTab, setScorersTab] = useState("goals");
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  const [dbErrorMsg, setDbErrorMsg] = useState("");

  const [editingTeamName, setEditingTeamName] = useState(false);
  const [tempAgeGroup, setTempAgeGroup] = useState("");
  const [results, setResults] = useState([]);
  const [competitions, setCompetitions] = useState(DEFAULT_COMPETITIONS);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [appearances, setAppearances] = useState([]);
  const [matchPhotos, setMatchPhotos] = useState([]);
  const [uploadingPhotosFor, setUploadingPhotosFor] = useState(null);
  const [lightbox, setLightbox] = useState(null); // { photos: [...], index: 0, title }
  const photoUploadRef = useRef();
  const photoUploadTargetRef = useRef(null);
  const [seasons, setSeasons] = useState([]);
  const [activeSeason, setActiveSeasonState] = useState(null);
  const [viewingSeason, setViewingSeason] = useState(null);
  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [newSeasonForm, setNewSeasonForm] = useState({ name: "", age_group: "" });

  const [editingComp, setEditingComp] = useState(null);
  const [tempCompName, setTempCompName] = useState("");
  const [filterComp, setFilterComp] = useState("All");
  const [filterRound, setFilterRound] = useState("All");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [editingResult, setEditingResult] = useState(null);
  const [editOppLogo, setEditOppLogo] = useState(null);
  const [editGoalCounts, setEditGoalCounts] = useState({});
  const [oppLogo, setOppLogo] = useState(null);
  const [newResult, setNewResult] = useState(null);
  const [logType, setLogType] = useState("league");
  const [tourDay, setTourDay] = useState(() => { try { return JSON.parse(localStorage.getItem("leon_tour_day") || "null"); } catch (e) { return null; } });
  const [tourSetup, setTourSetup] = useState({ name: "", date: new Date().toISOString().slice(0, 10), squad: [], creating: false });
  const [tourStage, setTourStage] = useState(TOUR_DRAFT?.stage || "Group stage");
  const tourCardRef = useRef();
  const tourShareRef = useRef();
  const [showTourShare, setShowTourShare] = useState(false);
  const [tourPlacement, setTourPlacement] = useState(null);
  const [lastTourGame, setLastTourGame] = useState(null);
  const [tourFinishing, setTourFinishing] = useState(false);
  const [tourEditSquad, setTourEditSquad] = useState(false);
  const [tourMore, setTourMore] = useState(false);
  const [tourBusy, setTourBusy] = useState(false);
  const [addingComp, setAddingComp] = useState(false);
  const [newCompName, setNewCompName] = useState("");

  // Team search / h2h
  const [teamSearch, setTeamSearch] = useState("");
  const [h2hTeam, setH2hTeam] = useState(null);
  const [editingTeam, setEditingTeam] = useState(null); // { id, name }
  const [editingTeamNameVal, setEditingTeamNameVal] = useState("");

  // Player / squad state
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [playerForm, setPlayerForm] = useState({ name: "", squad_number: "", photo: null });
  const [selectedSquad, setSelectedSquad] = useState([]);
  const [goalCounts, setGoalCounts] = useState(() => TOUR_DRAFT?.goalCounts || {});
  const [motmPlayerId, setMotmPlayerId] = useState(TOUR_DRAFT?.motmPlayerId || null);
  const [oppMotmPlayerId, setOppMotmPlayerId] = useState(null);
  const playerPhotoRef = useRef();
  const [uploadingPlayerPhoto, setUploadingPlayerPhoto] = useState(false);

  const [form, setForm] = useState({ date: "", opposition: TOUR_DRAFT?.opposition || "", homeScore: "", awayScore: TOUR_DRAFT?.awayScore || "", scorers: "", competition: "", motm: "", oppMotm: TOUR_DRAFT?.oppMotm || "", round: "", season_id: null });
  const fileRef = useRef();
  const editFileRef = useRef();
  const reportRef = useRef();
  const teamLogoRef = useRef();
  const [uploadingLogoForTeam, setUploadingLogoForTeam] = useState(null);

  // ── Load data ──────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const cs = await fetchClubSettings().catch(() => null);
        if (cs) { const b = { ...DEFAULT_BRANDING, ...cs }; setBranding(b); cacheBranding(b); }
        const [r, t, s, pl, ap, mp] = await Promise.all([fetchResults(), fetchTeams(), fetchSeasons(), fetchPlayers(), fetchAppearances(), fetchMatchPhotos()]);
        setResults(r);
        setTeams(t);
        setPlayers(pl);
        setAppearances(ap);
        setMatchPhotos(mp);
        if (s && s.length > 0) {
          setSeasons(s);
          const active = s.find(x => x.is_active) || s[0];
          setActiveSeasonState(active);
          setViewingSeason(active);
          const comps = active.competitions || DEFAULT_COMPETITIONS;
          setCompetitions(comps);
          setForm(f => ({ ...f, competition: comps[0] || "" }));
        } else {
          // No seasons yet — create the first one
          const created = await insertSeason({ name: "2025/26", age_group: "", is_active: true, competitions: DEFAULT_COMPETITIONS });
          setSeasons([created]);
          setActiveSeasonState(created);
          setViewingSeason(created);
          setCompetitions(DEFAULT_COMPETITIONS);
        }
      } catch(e) { setDbError(true); setDbErrorMsg(e?.message || String(e)); }
      setLoading(false);
    }
    load();
  }, []);

  // ── Derived ────────────────────────────────────────────
  const seasonResults = viewingSeason ? results.filter(r => r.season_id === viewingSeason.id) : results;
  // Build competitions from stored list + any competitions already used in results for this season
  const resultComps = seasonResults.map(r => r.competition).filter(Boolean);
  const competitionsInUse = [...new Set([...competitions, ...resultComps])];
  const roundsInUse = filterComp === "All" ? [] : [...new Set(seasonResults.filter(r => r.competition === filterComp).map(r => r.round).filter(Boolean))];

  const filteredResults = (filterComp === "All" ? seasonResults : seasonResults.filter(r => r.competition === filterComp))
    .filter(r => filterRound === "All" || !r.round || r.round === filterRound)
    .slice().sort((a, b) => {
      const da = new Date(a.date), db = new Date(b.date);
      return sortOrder === "desc" ? db - da : da - db;
    });

  const h2hResults = h2hTeam ? results.filter(r => r.opposition.toLowerCase() === h2hTeam.toLowerCase()) : [];

  // ── Home dashboard derived data ─────────────────────────
  const seasonResultsSorted = seasonResults.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  const latestResult = seasonResultsSorted[0] || null;
  const homeSeasonRecord = {
    played: seasonResults.length,
    won: seasonResults.filter(r => r.result === "W").length,
    drawn: seasonResults.filter(r => r.result === "D").length,
    lost: seasonResults.filter(r => r.result === "L").length,
  };

  // ── Trophy Cabinet derived data ──────────────────────────
  // Flatten every season's placements into one list, most recent season first.
  const trophyList = seasons
    .slice()
    .sort((a, b) => b.id - a.id)
    .flatMap(s => Object.entries(s.placements || {}).map(([competition, placement]) => ({ season: s, competition, placement })));
  const trophyWon = trophyList.filter(t => t.placement === "Winners").length;
  const trophyRunnerUp = trophyList.filter(t => t.placement === "Runners-up").length;

  // ── Handlers ───────────────────────────────────────────
  // With a squad set up, our score is the total of the goals logged against the players selected.
  const scoreFromScorers = players.length > 0;
  const leonGoals = selectedSquad.reduce((sum, pid) => sum + (goalCounts[pid] || 0), 0);
  const handleCreate = async () => {
    const hs = scoreFromScorers ? leonGoals : parseInt(form.homeScore), as_ = parseInt(form.awayScore);
    const result = hs > as_ ? "W" : hs < as_ ? "L" : "D";
    // Build scorers list from goalCounts
    const scorerList = Object.entries(goalCounts)
      .filter(([pid, count]) => count > 0 && (!scoreFromScorers || selectedSquad.includes(parseInt(pid))))
      .map(([pid, count]) => {
        const p = players.find(pl => pl.id === parseInt(pid));
        return p ? (count > 1 ? `${p.name} ×${count}` : p.name) : null;
      }).filter(Boolean);
    // MOTM from player selection or manual
    const motmName = motmPlayerId ? (players.find(p => p.id === motmPlayerId)?.name || "") : form.motm.trim();
    const oppMotmName = oppMotmPlayerId ? (players.find(p => p.id === oppMotmPlayerId)?.name || "") : form.oppMotm.trim();
    let displayDate = form.date;
    try { displayDate = new Date(form.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch(e) {}
    const newMatch = { date: displayDate, opposition: form.opposition, homeScore: hs, awayScore: as_, scorers: scorerList, result, competition: form.competition, motm: motmName, oppMotm: oppMotmName, oppLogo: oppLogo || null, round: (form.round || "").trim(), season_id: form.season_id || activeSeason?.id };
    try {
      const saved = await insertResult(newMatch);
      const match = saved || { ...newMatch, id: Date.now() };
      setResults(prev => [...prev, match]);
      setNewResult(match);
      showToast("✅ Result saved!");
      // Save appearances
      if (selectedSquad.length > 0 && match.id) {
        const appRecords = selectedSquad.map(pid => ({ player_id: pid, result_id: match.id, season_id: match.season_id }));
        try { const saved = await insertAppearances(appRecords); setAppearances(prev => [...prev, ...saved]); } catch(e) {}
      }
    } catch(e) {
      const match = { ...newMatch, id: Date.now() };
      setResults(prev => [...prev, match]);
      setNewResult(match);
      showToast("✅ Result saved!");
    }
    setSelectedSquad([]);
    setGoalCounts({});
    setMotmPlayerId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingResult) return;
    const hs = parseInt(editingResult.homeScore), as_ = parseInt(editingResult.awayScore);
    const result = hs > as_ ? "W" : hs < as_ ? "L" : "D";
    // If we have editGoalCounts use those, otherwise fall back to text field
    let scorerList;
    if (players.length > 0 && Object.keys(editGoalCounts).length > 0) {
      scorerList = Object.entries(editGoalCounts)
        .filter(([, count]) => count > 0)
        .map(([pid, count]) => {
          const p = players.find(pl => pl.id === parseInt(pid));
          return p ? (count > 1 ? `${p.name} ×${count}` : p.name) : null;
        }).filter(Boolean);
    } else {
      scorerList = typeof editingResult.scorers === "string"
        ? editingResult.scorers.split(",").map(s => s.trim()).filter(Boolean)
        : editingResult.scorers;
    }
    const updated = { ...editingResult, homeScore: hs, awayScore: as_, result, scorers: scorerList, oppLogo: editOppLogo === "remove" ? null : editOppLogo !== null ? editOppLogo : editingResult.oppLogo };
    try { await updateResult(updated); } catch(e) {}
    setResults(prev => prev.map(r => r.id === updated.id ? updated : r));
    setEditingResult(null); setEditOppLogo(null); setEditGoalCounts({});
    showToast("✅ Changes saved!");
  };

  const handleDeleteResult = async (id) => {
    try { await deleteAppearancesByResult(id); } catch(e) {}
    try { await deleteResult(id); } catch(e) {}
    setResults(prev => prev.filter(r => r.id !== id));
    setAppearances(prev => prev.filter(a => a.result_id !== id));
    setMatchPhotos(prev => prev.filter(p => p.result_id !== id)); // DB cascade-deletes these; keep local state in sync
    setSelectedMatch(null);
  };

  // ── Match photos ─────────────────────────────────────────
  const matchPhotosFor = (resultId) => matchPhotos.filter(p => p.result_id === resultId);

  const handleAddPhotos = async (resultId, fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length || !resultId) return;
    setUploadingPhotosFor(resultId);
    try {
      const uploads = [];
      for (const file of files) {
        try {
          const url = await uploadImage(file, "match-photos");
          uploads.push({ result_id: resultId, url });
        } catch (e) { /* skip a failed file, keep going with the rest */ }
      }
      if (uploads.length) {
        const saved = await insertMatchPhotos(uploads);
        setMatchPhotos(prev => [...(saved || uploads), ...prev]);
        showToast(`✅ ${uploads.length} photo${uploads.length > 1 ? "s" : ""} added!`);
      } else {
        showToast("⚠️ Couldn't upload those photos");
      }
    } catch (e) {
      showToast("⚠️ Couldn't upload those photos");
    }
    setUploadingPhotosFor(null);
  };

  const handleDeletePhoto = async (photo) => {
    if (!photo || !window.confirm("Delete this photo?")) return;
    try { await deleteMatchPhoto(photo.id); } catch (e) {}
    setMatchPhotos(prev => prev.filter(p => p.id !== photo.id));
    setLightbox(lb => {
      if (!lb) return lb;
      const remaining = lb.photos.filter(p => p.id !== photo.id);
      if (remaining.length === 0) return null;
      return { ...lb, photos: remaining, index: Math.min(lb.index, remaining.length - 1) };
    });
  };

  const handleSavePlayer = async () => {
    const data = { name: playerForm.name.trim(), squad_number: parseInt(playerForm.squad_number) || null, photo: playerForm.photo || null };
    if (!data.name) return;
    if (editingPlayer) {
      const updated = { ...editingPlayer, ...data };
      try { await updatePlayer(updated); } catch(e) {}
      setPlayers(prev => prev.map(p => p.id === updated.id ? updated : p));
    } else {
      const newData = { ...data, is_active: true };
      try { const saved = await insertPlayer(newData); setPlayers(prev => [...prev, saved || { ...newData, id: Date.now() }].sort((a,b) => (a.squad_number||99)-(b.squad_number||99))); }
      catch(e) { setPlayers(prev => [...prev, { ...newData, id: Date.now() }]); }
    }
    setShowPlayerModal(false);
    setEditingPlayer(null);
    setPlayerForm({ name: "", squad_number: "", photo: null });
    showToast("✅ Player saved!");
  };

  const handleTogglePlayerActive = async (player) => {
    const updated = { ...player, is_active: player.is_active === false ? true : false };
    setPlayers(prev => prev.map(p => p.id === updated.id ? updated : p));
    try { await updatePlayer(updated); } catch(e) {}
  };

  const handleDeletePlayer = async (id) => {
    try { await deletePlayer(id); } catch(e) {}
    setPlayers(prev => prev.filter(p => p.id !== id));
  };

  // Derived appearance counts
  const appearanceCountBySeason = (seasonId) => {
    const counts = {};
    appearances.filter(a => a.season_id === seasonId).forEach(a => {
      counts[a.player_id] = (counts[a.player_id] || 0) + 1;
    });
    return counts;
  };

  const handleAddTeam = async (name) => {
    const logo = teams.find(t => t.name === name)?.logo || null;
    const newTeam = { name: name || "New Team", logo };
    try { const saved = await insertTeam(newTeam); setTeams(prev => [...prev, saved || { ...newTeam, id: Date.now() }]); }
    catch(e) { setTeams(prev => [...prev, { ...newTeam, id: Date.now() }]); }
  };

  const handleDeleteTeam = async (id) => {
    try { await deleteTeam(id); } catch(e) {}
    setTeams(prev => prev.filter(t => t.id !== id));
  };

  const handleRenameTeam = async (id, newName) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const team = teams.find(t => t.id === id);
    if (!team) return;
    const updated = { ...team, name: trimmed };
    try { await updateTeam(updated); } catch(e) {}
    setTeams(prev => prev.map(t => t.id === id ? updated : t));
    // Also update any results that reference the old name
    setResults(prev => prev.map(r => r.opposition === team.name ? { ...r, opposition: trimmed } : r));
  };

  const handleSetPlacement = async (competition, placement) => {
    if (!viewingSeason) return;
    const newPlacements = { ...(viewingSeason.placements || {}) };
    if (placement) newPlacements[competition] = placement;
    else delete newPlacements[competition];
    const updated = { ...viewingSeason, placements: newPlacements };
    setViewingSeason(updated);
    setSeasons(prev => prev.map(s => s.id === updated.id ? updated : s));
    if (isViewingActive) setActiveSeasonState(updated);
    try { await updateSeason(updated); } catch(e) {}
  };

  const handleUpdateAgeGroup = async () => {
    const newName = tempAgeGroup.trim();
    if (!newName || !viewingSeason || newName === viewingSeason.age_group) { setEditingTeamName(false); return; }
    const updated = { ...viewingSeason, age_group: newName };
    setViewingSeason(updated);
    setSeasons(prev => prev.map(s => s.id === updated.id ? updated : s));
    if (isViewingActive) setActiveSeasonState(updated);
    try { await updateSeason(updated); } catch(e) {}
    setEditingTeamName(false);
  };

  const handleUnlockAdmin = () => {
    if (pinInput === ADMIN_PIN) {
      setIsAdmin(true);
      setShowPinGate(false);
      setPinInput("");
      setPinError(false);
      setMode("staff");
    } else {
      setPinError(true);
      setPinInput("");
    }
  };

  const openPlayerProfile = (name) => {
    if (!name) return;
    setPlayerProfileFrom(mode);
    setViewingPlayerName(name);
    setMode("player");
  };

  const handleLockAdmin = () => {
    setIsAdmin(false);
    setMode("home");
  };

  const compTypes = viewingSeason?.competition_types || {};
  const compTypeOf = name => compTypes[name] || (/friendly/i.test(name) ? "friendly" : "league");
  const compsOfType = t => competitions.filter(c => compTypeOf(c) === t);

  // Adds a competition of a given type to the season being viewed.
  const addCompNamed = async (rawName, type) => {
    const name = rawName.trim().replace(/\b\w/g, c => c.toUpperCase()); // title case
    if (!name) return null;
    const current = viewingSeason?.competitions || competitions;
    if (current.includes(name)) return name;
    const updated = [...current, name];
    const updatedTypes = { ...compTypes, [name]: type };
    setCompetitions(updated);
    if (viewingSeason) {
      const next = { ...viewingSeason, competitions: updated, competition_types: updatedTypes };
      setViewingSeason(next);
      setSeasons(prev => prev.map(x => x.id === next.id ? next : x));
      if (isViewingActive) setActiveSeasonState(next);
      try { await updateSeason(next); } catch(e) {}
    }
    return name;
  };
  useEffect(() => {
    if (logType === "tournament") return;
    const list = competitions.filter(c => ((viewingSeason?.competition_types || {})[c] || (/friendly/i.test(c) ? "friendly" : "league")) === logType);
    if (list.length && !list.includes(form.competition)) setForm(f => ({ ...f, competition: list[0] }));
  }, [logType, competitions, viewingSeason]);
  // Safety net: the competition list always follows the season being viewed.
  useEffect(() => { if (viewingSeason?.competitions) setCompetitions(viewingSeason.competitions); }, [viewingSeason?.id]);
  const handleAddComp = async () => {
    const name = await addCompNamed(newCompName, logType);
    if (name) setForm(f => ({ ...f, competition: name })); // auto-select the new competition
    setNewCompName("");
    setAddingComp(false);
  };
  const chooseLogType = async t => {
    setLogType(t); setAddingComp(false);
    if (t === "friendly") {
      const name = compsOfType("friendly")[0] || await addCompNamed("Friendly", "friendly");
      if (name) setForm(f => ({ ...f, competition: name, round: "" }));
    } else if (t !== "tournament") {
      const list = compsOfType(t);
      setForm(f => ({ ...f, competition: list.includes(f.competition) ? f.competition : (list[0] || ""), round: t === "cup" ? f.round : "" }));
    }
  };
  useEffect(() => { try { if (tourDay) localStorage.setItem("leon_tour_day", JSON.stringify(tourDay)); else { localStorage.removeItem("leon_tour_day"); localStorage.removeItem("leon_tour_draft"); } } catch (e) {} }, [tourDay]);
  // Keep a half-entered game so it survives leaving the screen or closing the app.
  useEffect(() => {
    if (!tourDay) return;
    try { localStorage.setItem("leon_tour_draft", JSON.stringify({ opposition: form.opposition, awayScore: form.awayScore, oppMotm: form.oppMotm, goalCounts, motmPlayerId, stage: tourStage })); } catch (e) {}
  }, [tourDay, form.opposition, form.awayScore, form.oppMotm, goalCounts, motmPlayerId, tourStage]);

  // ── Tournament day mode ───────────────────────────────
  const fmtTourDate = iso => { try { return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return iso; } };
  const tourSeasonId = () => tourDay?.season_id || form.season_id || activeSeason?.id;
  const tourGames = tourDay ? results.filter(r => r.competition === tourDay.name && r.date === fmtTourDate(tourDay.date)) : [];
  const tourGoals = tourDay ? tourDay.squad.reduce((sum, pid) => sum + (goalCounts[pid] || 0), 0) : 0;
  const handleStartTour = async () => {
    const name = await addCompNamed(tourSetup.name, "tournament");
    if (!name) return;
    setTourDay({ name, date: tourSetup.date, squad: tourSetup.squad, season_id: form.season_id || activeSeason?.id || viewingSeason?.id });
    setGoalCounts({}); setMotmPlayerId(null); setTourStage("Group stage"); setTourFinishing(false);
    setForm(f => ({ ...f, opposition: "", awayScore: "", oppMotm: "" }));
  };
  const handleSaveTourGame = async () => {
    if (!tourDay || !form.opposition || tourBusy) return;
    setTourBusy(true);
    const hs = tourGoals, as_ = parseInt(form.awayScore) || 0;
    const scorerList = Object.entries(goalCounts)
      .filter(([pid, c]) => c > 0 && tourDay.squad.includes(parseInt(pid)))
      .map(([pid, c]) => { const pl = players.find(x => x.id === parseInt(pid)); return pl ? (c > 1 ? `${pl.name} ×${c}` : pl.name) : null; }).filter(Boolean);
    const motmName = motmPlayerId ? (players.find(x => x.id === motmPlayerId)?.name || "") : "";
    const newMatch = { date: fmtTourDate(tourDay.date), opposition: form.opposition, homeScore: hs, awayScore: as_, scorers: scorerList,
      result: hs > as_ ? "W" : hs < as_ ? "L" : "D", competition: tourDay.name, motm: motmName, oppMotm: (form.oppMotm || "").trim(), oppLogo: null, round: tourStage, season_id: tourSeasonId() };
    try {
      const saved = await insertResult(newMatch);
      const match = saved || { ...newMatch, id: Date.now() };
      setResults(prev => [...prev, match]);
      if (tourDay.squad.length > 0 && match.id) {
        try { const recs = await insertAppearances(tourDay.squad.map(pid => ({ player_id: pid, result_id: match.id, season_id: match.season_id }))); setAppearances(prev => [...prev, ...recs]); } catch(e) {}
      }
      showToast(`✅ ${hs}–${as_} v ${form.opposition} saved`);
      setLastTourGame({ id: match.id, label: `v ${form.opposition} ${hs}–${as_}` });
      setGoalCounts({}); setMotmPlayerId(null); setTourMore(false);
      setForm(f => ({ ...f, opposition: "", awayScore: "", oppMotm: "" }));
    } catch(e) { showToast("⚠️ Couldn't save that game — try again"); }
    setTourBusy(false);
  };
  const handleUndoTourGame = async () => {
    if (!lastTourGame) return;
    await handleDeleteResult(lastTourGame.id);
    showToast(`↶ Removed ${lastTourGame.label}`);
    setLastTourGame(null);
  };
  const handleFinishTour = async placement => {
    if (placement && viewingSeason && viewingSeason.id === tourDay?.season_id) await handleSetPlacement(tourDay.name, placement);
    setTourDay(null); setTourFinishing(false); setGoalCounts({}); setMotmPlayerId(null); setLastTourGame(null); setTourPlacement(null);
    showToast(placement ? `🏆 ${placement} saved` : "Tournament finished");
  };

  const handleRenameComp = async (idx) => {
    const oldName = competitions[idx], newName = tempCompName.trim();
    if (!newName || newName === oldName) { setEditingComp(null); return; }
    const updated = competitions.map((c, i) => i === idx ? newName : c);
    setCompetitions(updated);
    setResults(prev => prev.map(r => r.competition === oldName && r.season_id === viewingSeason?.id ? { ...r, competition: newName } : r));
    if (filterComp === oldName) setFilterComp(newName);
    if (viewingSeason) {
      try {
        // Carry the game type and any placement across to the new name.
        const types = { ...(viewingSeason.competition_types || {}) };
        if (types[oldName]) { types[newName] = types[oldName]; delete types[oldName]; }
        const placements = { ...(viewingSeason.placements || {}) };
        if (placements[oldName]) { placements[newName] = placements[oldName]; delete placements[oldName]; }
        const next = { ...viewingSeason, competitions: updated, competition_types: types, placements };
        await updateSeason(next);
        setViewingSeason(next);
        setSeasons(prev => prev.map(x => x.id === next.id ? next : x));
        if (isViewingActive) setActiveSeasonState(next);
      } catch(e) {}
    }
    setEditingComp(null);
  };

  const isViewingActive = !viewingSeason || !activeSeason || viewingSeason?.id === activeSeason?.id;

  const handleStartNewSeason = async () => {
    if (!newSeasonForm.name) return;
    try {
      await setActiveSeason(0);
      const created = await insertSeason({ name: newSeasonForm.name, age_group: newSeasonForm.age_group, is_active: true, competitions: DEFAULT_COMPETITIONS });
      setSeasons(prev => [created, ...prev.map(s => ({ ...s, is_active: false }))]);
      setActiveSeasonState(created);
      setViewingSeason(created);
      setCompetitions(DEFAULT_COMPETITIONS);
      setForm(f => ({ ...f, competition: "" }));
    } catch(e) { alert("Failed to create season — " + e.message); }
    setShowSeasonModal(false);
    setNewSeasonForm({ name: "", age_group: "" });
  };

  // ── Styles ─────────────────────────────────────────────
  const inputStyle = { width: "100%", padding: "12px 14px", border: "2px solid #e8e8e8", borderRadius: 10, fontSize: 16, fontFamily: "inherit", fontWeight: 600, color: THEME.navy, outline: "none", boxSizing: "border-box" };
  const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, color: THEME.skyInk, letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" };
  const cardStyle = { background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", maxWidth: 520, margin: "0 auto" };

  // ── Loading / Error screens ─────────────────────────────
  const renderTournamentDay = () => {
    const chipSt = on => ({ padding: "8px 14px", borderRadius: 20, border: on ? "none" : "1.5px solid #e0e0e0", background: on ? THEME.navy : "#fff", color: on ? THEME.sky : "#888", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" });
    const squadPlayers = players.filter(p => p.is_active !== false);
    const sectionLabel = { ...labelStyle, marginTop: 4 };

    // ── Not started yet: pick the tournament, date and squad once ──
    if (!tourDay) {
      const s = tourSetup;
      const existing = compsOfType("tournament");
      const canStart = s.name.trim() && s.date && (players.length === 0 || s.squad.length > 0);
      return (
        <>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Which tournament?</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {existing.map(n => <button key={n} onClick={() => setTourSetup(x => ({ ...x, name: n, creating: false }))} style={chipSt(!s.creating && s.name === n)}>{n}</button>)}
              <button onClick={() => setTourSetup(x => ({ ...x, creating: true, name: "" }))} style={{ ...chipSt(s.creating), border: s.creating ? "none" : `1.5px dashed ${THEME.sky}`, color: s.creating ? THEME.sky : THEME.skyInk }}>+ New tournament</button>
            </div>
            {s.creating && <input autoFocus placeholder="Tournament name…" value={s.name} onChange={e => setTourSetup(x => ({ ...x, name: e.target.value }))} style={{ ...inputStyle, marginTop: 10 }} />}
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Date</label>
            <input type="date" value={s.date} onChange={e => setTourSetup(x => ({ ...x, date: e.target.value }))} style={{ ...inputStyle, colorScheme: "light" }} />
          </div>
          {players.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Who's playing today? <span style={{ textTransform: "none", letterSpacing: 0, color: "#aaa", fontWeight: 600 }}>(pick once)</span></label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {squadPlayers.map(pl => {
                  const on = s.squad.includes(pl.id);
                  return <button key={pl.id} onClick={() => setTourSetup(x => ({ ...x, squad: on ? x.squad.filter(i => i !== pl.id) : [...x.squad, pl.id] }))} style={chipSt(on)}>{pl.name}</button>;
                })}
                <button onClick={() => setTourSetup(x => ({ ...x, squad: x.squad.length === squadPlayers.length ? [] : squadPlayers.map(pl => pl.id) }))} style={{ ...chipSt(false), border: `1.5px dashed ${THEME.sky}`, color: THEME.skyInk }}>{s.squad.length === squadPlayers.length ? "Clear" : "Select all"}</button>
              </div>
            </div>
          )}
          <button onClick={handleStartTour} disabled={!canStart}
            style={{ width: "100%", padding: 16, background: THEME.navy, color: THEME.sky, border: "none", borderRadius: 12, fontSize: 16, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", opacity: canStart ? 1 : 0.4 }}>Start tournament →</button>
        </>
      );
    }

    const w = tourGames.filter(r => r.result === "W").length, d = tourGames.filter(r => r.result === "D").length, l = tourGames.filter(r => r.result === "L").length;
    const rc = r => r === "W" ? "#00c853" : r === "L" ? "#d50000" : "#ffab00";
    const gameRows = tourGames.map(m => (
      <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", borderRadius: 10, padding: "9px 12px", marginBottom: 6, borderLeft: `4px solid ${rc(m.result)}`, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: THEME.navy }}>v {m.opposition}</span>
        <span style={{ fontSize: 11, color: THEME.ink60 }}>{m.round}</span>
        <span style={{ fontWeight: 800, fontSize: 14, color: THEME.navy }}>{m.homeScore}–{m.awayScore}</span>
        <button onClick={() => setNewResult(m)} style={{ border: "none", background: "#f0f2f6", borderRadius: 8, padding: "4px 8px", fontSize: 11, fontWeight: 700, color: THEME.navy, cursor: "pointer" }}>Card</button>
      </div>
    ));
    const header = (
      <div style={{ background: THEME.navySoft, color: "#fff", borderRadius: 12, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 18 }}>🎪</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.2 }}>{tourDay.name}</div>
          <div style={{ fontSize: 11, color: "#aab0cc" }}>{fmtTourDate(tourDay.date)} · {tourDay.squad.length} players</div>
        </div>
        <div style={{ fontFamily: THEME.mono, fontSize: 11, color: THEME.sky, textAlign: "right" }}>{tourGames.length} played<br />W{w} D{d} L{l}</div>
      </div>
    );

    // ── Finishing: how did you place? ──
    if (tourFinishing) {
      const chosen = tourPlacement || viewingSeason?.placements?.[tourDay.name] || null;
      return (
        <>
          {header}
          <label style={labelStyle}>How did you finish?</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {PLACEMENT_OPTIONS.map(opt => <button key={opt} onClick={() => setTourPlacement(opt)} style={chipSt(chosen === opt)}>{(PLACEMENT_META[opt]?.icon || "") + " " + opt}</button>)}
          </div>
          {tourGames.length === 0 ? <p style={{ color: "#aaa", fontSize: 13 }}>No games logged yet.</p> : (
            <>
              <label style={labelStyle}>Tournament card</label>
              <TournamentCard cardRef={tourCardRef} name={tourDay.name} date={fmtTourDate(tourDay.date)} placement={chosen} games={tourGames} players={players} />
              <div style={{ marginTop: 10, marginBottom: 14 }}>
                <SaveCardButton cardRef={tourCardRef} filename="tournament-summary.png" onSaved={() => showToast("📸 Card ready")}
                  shareText={`${chosen ? (PLACEMENT_META[chosen]?.icon || "🏆") + " " + chosen + " — " : ""}${tourDay.name} · P${tourGames.length} W${w} D${d} L${l}`} />
              </div>
            </>
          )}
          <button onClick={() => handleFinishTour(chosen)} style={{ width: "100%", padding: 16, background: THEME.navy, color: THEME.sky, border: "none", borderRadius: 12, fontSize: 15, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}>{chosen ? "Save placement & finish" : "Finish without a placement"}</button>
          <button onClick={() => setTourFinishing(false)} style={{ width: "100%", marginTop: 8, padding: 10, background: "none", border: "none", color: THEME.ink60, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>← Back to games</button>
        </>
      );
    }

    // ── Logging games ──
    const sq = tourDay.squad.map(pid => players.find(x => x.id === pid)).filter(Boolean);
    const awayN = parseInt(form.awayScore) || 0;
    const stepBtn = (primary, onClick, txt) => <button onClick={onClick} style={{ width: 36, height: 36, borderRadius: "50%", border: primary ? "none" : "1.5px solid #e0e0e0", background: primary ? THEME.navy : "#fff", color: primary ? "#fff" : THEME.navy, fontSize: 20, cursor: "pointer" }}>{txt}</button>;
    return (
      <>
        {header}
        {tourGames.length > 0 && <div style={{ marginBottom: 12 }}>{gameRows}</div>}
        {lastTourGame && tourGames.some(g => g.id === lastTourGame.id) && (
          <button onClick={handleUndoTourGame} style={{ background: "none", border: "none", color: "#d50000", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "0 0 12px", fontFamily: "inherit" }}>↶ Undo last game ({lastTourGame.label})</button>
        )}
        <div style={{ marginBottom: 14 }}>
          <button onClick={() => setTourEditSquad(v => !v)} style={{ background: "none", border: "none", color: THEME.skyInk, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>{tourEditSquad ? "▲ Done" : "✎ Change today's players"}</button>
          {tourEditSquad && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {squadPlayers.map(pl => {
                const on = tourDay.squad.includes(pl.id);
                return <button key={pl.id} onClick={() => setTourDay(t => ({ ...t, squad: on ? t.squad.filter(i => i !== pl.id) : [...t.squad, pl.id] }))} style={chipSt(on)}>{pl.name}</button>;
              })}
            </div>
          )}
        </div>

        <label style={sectionLabel}>Game {tourGames.length + 1}</label>
        <div style={{ marginBottom: 12 }}>
          <TeamPicker teams={teams} value={form.opposition} onChange={v => setForm(f => ({ ...f, opposition: v }))} onAddNew={name => { handleAddTeam(name); setForm(f => ({ ...f, opposition: name })); }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div style={{ background: "#f0f2f6", borderRadius: 12, padding: "8px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: THEME.navy, lineHeight: 1.1 }}>{tourGoals}</div>
            <div style={{ fontSize: 10, color: THEME.ink60, fontWeight: 700 }}>{BRAND.short.toUpperCase()} · from scorers</div>
          </div>
          <div style={{ background: "#f0f2f6", borderRadius: 12, padding: "8px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {stepBtn(false, () => setForm(f => ({ ...f, awayScore: String(Math.max(0, awayN - 1)) })), "−")}
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 28, fontWeight: 900, color: THEME.navy, lineHeight: 1.1 }}>{awayN}</div><div style={{ fontSize: 10, color: THEME.ink60, fontWeight: 700 }}>THEM</div></div>
            {stepBtn(true, () => setForm(f => ({ ...f, awayScore: String(awayN + 1) })), "+")}
          </div>
        </div>

        <label style={sectionLabel}>Stage</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {STAGES.map(st => <button key={st} onClick={() => setTourStage(st)} style={chipSt(tourStage === st)}>{st}</button>)}
        </div>

        {sq.length > 0 && (
          <>
            <label style={sectionLabel}>Scorers — tap to add a goal</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              {sq.map(pl => {
                const c = goalCounts[pl.id] || 0;
                return (
                  <span key={pl.id} style={{ display: "inline-flex", alignItems: "center" }}>
                    <button onClick={() => setGoalCounts(g => ({ ...g, [pl.id]: (g[pl.id] || 0) + 1 }))} style={{ ...chipSt(c > 0), borderTopRightRadius: c > 0 ? 0 : 20, borderBottomRightRadius: c > 0 ? 0 : 20 }}>{pl.name}{c > 0 ? ` ⚽${c}` : ""}</button>
                    {c > 0 && <button onClick={() => setGoalCounts(g => ({ ...g, [pl.id]: Math.max(0, (g[pl.id] || 0) - 1) }))} style={{ padding: "8px 11px", border: "none", background: THEME.navySoft, color: "#fff", borderRadius: "0 20px 20px 0", fontSize: 14, cursor: "pointer", borderLeft: "1px solid rgba(255,255,255,0.2)" }}>−</button>}
                  </span>
                );
              })}
            </div>
            <button onClick={() => setTourMore(v => !v)} style={{ background: "none", border: "none", color: THEME.skyInk, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0, marginBottom: 10, fontFamily: "inherit" }}>{tourMore ? "▲ Less" : "⭐ Man of the match…"}</button>
            {tourMore && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {sq.map(pl => <button key={pl.id} onClick={() => setMotmPlayerId(motmPlayerId === pl.id ? null : pl.id)} style={chipSt(motmPlayerId === pl.id)}>{pl.name}</button>)}
                </div>
                <input type="text" placeholder="Opposition MOTM (optional)" value={form.oppMotm} onChange={e => setForm(f => ({ ...f, oppMotm: e.target.value }))} style={inputStyle} />
              </div>
            )}
          </>
        )}

        <button onClick={handleSaveTourGame} disabled={!form.opposition || tourBusy}
          style={{ width: "100%", padding: 16, background: THEME.navy, color: THEME.sky, border: "none", borderRadius: 12, fontSize: 16, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", opacity: (!form.opposition || tourBusy) ? 0.4 : 1 }}>{tourBusy ? "Saving…" : "Save & next game"}</button>
        <button onClick={() => setTourFinishing(true)} style={{ width: "100%", marginTop: 8, padding: 13, background: "#fff", color: THEME.navy, border: "2px solid #e8e8e8", borderRadius: 12, fontWeight: 800, fontSize: 13, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}>Finish tournament</button>
      </>
    );
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: THEME.navy, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, fontFamily: "inherit" }}>
      <ClubLogo size={80} />
      <div style={{ color: THEME.sky, fontSize: 22, fontWeight: 800, letterSpacing: 3 }}>LOADING...</div>
    </div>
  );

  if (dbError) return (
    <div style={{ minHeight: "100vh", background: THEME.navy, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, fontFamily: "inherit", textAlign: "center" }}>
      <ClubLogo size={80} />
      <div style={{ color: "#d50000", fontSize: 22, fontWeight: 800, letterSpacing: 2 }}>⚠️ CONNECTION ERROR</div>
      <div style={{ color: "#aaa", fontSize: 15, maxWidth: 320, lineHeight: 1.5 }}>Could not connect to the database. Check your Supabase URL and API key in <code style={{ color: THEME.sky }}>src/supabase.js</code></div>
      {dbErrorMsg && <div style={{ color: "#ff7eb3", fontSize: 12, maxWidth: 320, marginTop: 8, wordBreak: "break-all", background: "rgba(255,255,255,0.05)", padding: "8px 12px", borderRadius: 8 }}>{dbErrorMsg}</div>}
      <button onClick={() => window.location.reload()} style={{ background: THEME.sky, color: THEME.navy, border: "none", borderRadius: 10, padding: "12px 24px", fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>Try Again</button>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: THEME.chalk, backgroundImage: "linear-gradient(rgba(18,23,46,0.035) 2px, transparent 2px), linear-gradient(90deg, rgba(18,23,46,0.035) 2px, transparent 2px)", backgroundSize: "60px 60px, 60px 60px", backgroundPosition: "30px 0, 0 30px", fontFamily: THEME.body, paddingBottom: 100 }}>

      {/* Top bar */}
      <div style={{ background: THEME.navy, padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.3)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -20, right: -30, width: 140, height: 140, opacity: 0.08, backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="white" d="M20 65 Q 35 55 45 40 Q 50 30 58 32 Q 65 34 62 42 Q 58 52 68 48 Q 78 44 75 55 Q 70 68 55 70 Q 40 72 30 78 Z"/></svg>')`, backgroundSize: "contain", backgroundRepeat: "no-repeat", pointerEvents: "none" }} />
        <div style={{ background: THEME.white, borderRadius: "50%", padding: 4, display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, flexShrink: 0, border: `2px solid ${THEME.sky}`, position: "relative", zIndex: 1 }}>
          <ClubLogo size={34} />
        </div>
        <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
          <div style={{ color: THEME.white, fontFamily: THEME.display, fontWeight: 600, fontSize: 17, letterSpacing: 0.5, lineHeight: 1.1 }}>{BRAND.name}</div>
          {editingTeamName ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <input autoFocus value={tempAgeGroup} onChange={e => setTempAgeGroup(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleUpdateAgeGroup(); if (e.key === "Escape") setEditingTeamName(false); }}
                style={{ background: "rgba(255,255,255,0.15)", border: `1px solid ${THEME.sky}`, borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 600, letterSpacing: 1, padding: "3px 8px", fontFamily: THEME.mono, width: 150, outline: "none" }} />
              <button onClick={handleUpdateAgeGroup} style={{ background: THEME.sky, border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontWeight: 700, fontSize: 11, color: THEME.navy, fontFamily: THEME.body }}>Save</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 1 }}>
              <div style={{ color: THEME.sky, fontFamily: THEME.mono, fontWeight: 600, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase" }}>{viewingSeason?.age_group || "Team"}</div>
              {isAdmin && isViewingActive && (
                <button onClick={() => { setTempAgeGroup(viewingSeason?.age_group || ""); setEditingTeamName(true); }} style={{ background: "rgba(95,178,217,0.18)", border: `1px solid rgba(95,178,217,0.35)`, borderRadius: 5, padding: "1px 6px", cursor: "pointer", color: THEME.sky, fontSize: 9, fontWeight: 700, fontFamily: THEME.body }}>Edit</button>
              )}
            </div>
          )}
        </div>
        {isAdmin ? (
          <span style={{ fontFamily: THEME.mono, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", background: THEME.amber, color: "#3a2a05", padding: "4px 8px", borderRadius: 20, fontWeight: 700, flexShrink: 0 }}>🔓 Admin</span>
        ) : (
          <button onClick={() => setShowPinGate(true)} title="Staff Room"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14, flexShrink: 0 }}>
            🔒
          </button>
        )}
      </div>

      {/* Season selector row */}
      <div style={{ background: THEME.navySoft, padding: "8px 20px", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
        {seasons.length > 0 && (
          <select value={viewingSeason?.id || ""} onChange={e => {
            const s = seasons.find(x => x.id === parseInt(e.target.value));
            if (s) { setViewingSeason(s); setFilterComp("All"); setSelectedMatch(null); setCompetitions(s.competitions || []); }
          }} style={{ background: "rgba(255,255,255,0.08)", border: `1px solid rgba(95,178,217,0.35)`, borderRadius: 8, color: THEME.sky, fontSize: 11, fontWeight: 700, padding: "4px 8px", fontFamily: THEME.body, cursor: "pointer", outline: "none" }}>
            {seasons.map(s => <option key={s.id} value={s.id} style={{ background: THEME.navy }}>{s.name} {s.is_active ? "✓" : ""}</option>)}
          </select>
        )}
        {isViewingActive && isAdmin && (
          <button onClick={() => setShowSeasonModal(true)} style={{ background: "rgba(95,178,217,0.15)", border: `1px solid rgba(95,178,217,0.3)`, borderRadius: 6, color: THEME.sky, fontSize: 9, fontWeight: 700, padding: "3px 8px", cursor: "pointer", fontFamily: THEME.body, letterSpacing: 1 }}>
            + NEW SEASON
          </button>
        )}
      </div>

      {/* Past season banner */}
      {!isViewingActive && (
        <div style={{ background: THEME.amber, padding: "8px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#3a2a05", letterSpacing: 0.5 }}>📅 Viewing: {viewingSeason?.name}{viewingSeason?.age_group ? ` — ${viewingSeason.age_group}` : ""}</span>
          <button onClick={() => { setViewingSeason(activeSeason); setCompetitions(activeSeason?.competitions || []); setFilterComp("All"); }} style={{ background: THEME.navy, color: THEME.amber, border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: THEME.body }}>Back to Current</button>
        </div>
      )}


      {/* Competition / Round filters — dropdowns, no horizontal swipe needed */}
      {(mode === "history" || (mode === "scorers" && scorersTab !== "squad")) && (
        <div style={{ background: "#fff", borderBottom: "1px solid #f0f0f0", padding: "10px 16px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: "1 1 140px", display: "flex", alignItems: "center", gap: 6 }}>
            <select value={filterComp} onChange={e => { setFilterComp(e.target.value); setSelectedMatch(null); setFilterRound("All"); }}
              style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e0e0e0", background: "#fff", color: THEME.navy, fontWeight: 700, fontSize: 13, fontFamily: THEME.body, cursor: "pointer", outline: "none" }}>
              <option value="All">All Competitions</option>
              {competitionsInUse.map(comp => <option key={comp} value={comp}>{comp}</option>)}
            </select>
            {isAdmin && filterComp !== "All" && competitions.includes(filterComp) && (
              editingComp === competitions.indexOf(filterComp) ? (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <input autoFocus value={tempCompName} onChange={e => setTempCompName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleRenameComp(competitions.indexOf(filterComp)); if (e.key === "Escape") setEditingComp(null); }}
                    style={{ border: `1.5px solid ${THEME.sky}`, borderRadius: 10, padding: "8px 10px", fontSize: 13, fontWeight: 700, fontFamily: THEME.body, outline: "none", width: 110 }} />
                  <button onClick={() => handleRenameComp(competitions.indexOf(filterComp))} style={{ background: THEME.navy, color: THEME.sky, border: "none", borderRadius: 8, padding: "8px 9px", cursor: "pointer", fontFamily: THEME.body, fontSize: 12, fontWeight: 800 }}>✓</button>
                  <button onClick={() => setEditingComp(null)} style={{ background: "#eee", color: "#888", border: "none", borderRadius: 8, padding: "8px 9px", cursor: "pointer", fontFamily: THEME.body, fontSize: 12 }}>✕</button>
                </div>
              ) : (
                <button onClick={() => { setEditingComp(competitions.indexOf(filterComp)); setTempCompName(filterComp); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#bbb", padding: "4px", flexShrink: 0 }}>✏️</button>
              )
            )}
          </div>

          {mode === "history" && filterComp !== "All" && roundsInUse.length > 0 && (
            <select value={filterRound} onChange={e => setFilterRound(e.target.value)}
              style={{ flex: "1 1 120px", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e0e0e0", background: "#fff", color: THEME.navy, fontWeight: 700, fontSize: 13, fontFamily: THEME.body, cursor: "pointer", outline: "none" }}>
              <option value="All">All Rounds</option>
              {roundsInUse.map(round => <option key={round} value={round}>{round}</option>)}
            </select>
          )}
        </div>
      )}

      <div style={{ padding: "20px 16px" }}>
        {/* ── HOME TAB ── */}
        {mode === "home" && (
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            <div style={{ fontFamily: THEME.mono, fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", color: THEME.ink60, marginBottom: 10 }}>Season Record</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              {[
                { l: "Played", v: homeSeasonRecord.played, c: THEME.navy },
                { l: "Won", v: homeSeasonRecord.won, c: THEME.pitch },
                { l: "Drawn", v: homeSeasonRecord.drawn, c: THEME.amber },
                { l: "Lost", v: homeSeasonRecord.lost, c: THEME.loss },
              ].map(x => (
                <div key={x.l} style={{ flex: 1, background: THEME.white, borderRadius: 12, padding: "10px 6px", textAlign: "center", boxShadow: "0 2px 8px rgba(18,23,46,0.06)" }}>
                  <div style={{ fontFamily: THEME.mono, fontSize: 20, fontWeight: 700, color: x.c }}>{x.v}</div>
                  <div style={{ fontSize: 10, color: THEME.ink60, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{x.l}</div>
                </div>
              ))}
            </div>

            <div style={{ fontFamily: THEME.mono, fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", color: THEME.ink60, marginBottom: 10 }}>Latest Result</div>
            {latestResult ? (
              <ScoreCard match={latestResult} compColor={getCompColor(competitions, latestResult.competition)} />
            ) : (
              <div style={{ textAlign: "center", padding: "30px 20px", color: THEME.ink30, background: THEME.white, borderRadius: 16, marginBottom: 24 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>⚽</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink60 }}>No results logged yet</div>
              </div>
            )}

            {trophyList.length > 0 && (
              <>
                <div style={{ fontFamily: THEME.mono, fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", color: THEME.ink60, margin: "24px 0 10px" }}>Trophy Cabinet</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  {[
                    { l: "Won", v: trophyWon, c: THEME.amber },
                    { l: "Runner-up", v: trophyRunnerUp, c: THEME.ink60 },
                    { l: "3rd Place", v: trophyList.filter(t => t.placement === "3rd Place").length, c: THEME.ink60 },
                  ].map(x => (
                    <div key={x.l} style={{ flex: 1, background: THEME.white, borderRadius: 12, padding: "10px 4px", textAlign: "center", boxShadow: "0 2px 8px rgba(18,23,46,0.06)" }}>
                      <div style={{ fontFamily: THEME.mono, fontSize: 19, fontWeight: 700, color: x.c }}>{x.v}</div>
                      <div style={{ fontSize: 9, color: THEME.ink60, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.2 }}>{x.l}</div>
                    </div>
                  ))}
                </div>
                {trophyList.map((t, i) => {
                  const meta = PLACEMENT_META[t.placement] || { icon: "🏅", bg: THEME.chalk, color: THEME.ink60 };
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: THEME.white, borderRadius: 12, padding: "10px 12px", marginBottom: 8, boxShadow: "0 2px 8px rgba(18,23,46,0.05)" }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{meta.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: THEME.display, fontWeight: 600, fontSize: 12, color: THEME.navy, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.competition}</div>
                        <div style={{ fontFamily: THEME.mono, fontSize: 9.5, fontWeight: 700, color: meta.color, marginTop: 2 }}>{t.placement}</div>
                      </div>
                      <span style={{ fontFamily: THEME.mono, fontSize: 9, color: THEME.ink60, flexShrink: 0 }}>{t.season.name}</span>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* ── SET PLACEMENT (admin) ── */}
        {mode === "placements" && isAdmin && (
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            <button onClick={() => setMode("staff")} style={{ background: "none", border: "none", color: THEME.ink60, fontFamily: THEME.mono, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", padding: "0 0 14px", display: "flex", alignItems: "center", gap: 4 }}>
              ‹ Back
            </button>
            <div style={{ fontFamily: THEME.mono, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: THEME.ink60, marginBottom: 4 }}>{viewingSeason?.name}</div>
            <div style={{ fontFamily: THEME.display, fontWeight: 600, fontSize: 16, color: THEME.navy, marginBottom: 18 }}>Set tournament placements</div>
            {competitions.filter(c => compTypeOf(c) === "tournament" || viewingSeason?.placements?.[c]).length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 20px", color: THEME.ink30 }}>No tournaments in this season yet.</div>
            ) : competitions.filter(c => compTypeOf(c) === "tournament" || viewingSeason?.placements?.[c]).map(comp => {
              const current = viewingSeason?.placements?.[comp] || null;
              return (
                <div key={comp} style={{ background: THEME.white, borderRadius: 14, padding: 14, marginBottom: 12, boxShadow: "0 2px 8px rgba(18,23,46,0.05)" }}>
                  <div style={{ fontFamily: THEME.display, fontWeight: 600, fontSize: 14, color: THEME.navy, marginBottom: 10 }}>{comp}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {PLACEMENT_OPTIONS.map(opt => {
                      const meta = PLACEMENT_META[opt];
                      const selected = current === opt;
                      return (
                        <button key={opt} onClick={() => handleSetPlacement(comp, selected ? null : opt)}
                          style={{ display: "flex", alignItems: "center", gap: 8, border: `1.5px solid ${selected ? THEME.amber : "#e0e0e0"}`, background: selected ? "#fdf6e8" : "#fff", borderRadius: 12, padding: 10, fontSize: 11, fontWeight: 700, color: selected ? THEME.navy : "#888", cursor: "pointer", fontFamily: THEME.body, textAlign: "left" }}>
                          <span style={{ fontSize: 16 }}>{meta.icon}</span>{opt}
                        </button>
                      );
                    })}
                  </div>
                  {current && (
                    <button onClick={() => handleSetPlacement(comp, null)} style={{ width: "100%", marginTop: 8, padding: "8px", background: "none", border: "none", color: THEME.ink60, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: THEME.body }}>
                      Clear placement
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── PLAYER PROFILE ── */}
        {mode === "player" && viewingPlayerName && (
          <PlayerProfileScreen
            name={viewingPlayerName}
            players={players}
            appearances={appearances}
            results={results}
            seasons={seasons}
            ageGroup={viewingSeason?.age_group}
            onBack={() => { setMode(playerProfileFrom); setViewingPlayerName(null); }}
          />
        )}

        {mode === "branding" && isAdmin && (
          <BrandingScreen branding={branding} showToast={showToast} onBack={() => setMode("staff")}
            onSave={async d => { const saved = await saveClubSettings(d); const b = { ...DEFAULT_BRANDING, ...(saved || d) }; setBranding(b); cacheBranding(b); }} />
        )}

        {/* ── STAFF ROOM (admin hub) ── */}
        {mode === "staff" && isAdmin && (
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            <div style={{ fontFamily: THEME.mono, fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", color: THEME.ink60, marginBottom: 10 }}>Manage</div>
            {[
              { key: "new", icon: "⚽", accent: THEME.sky, title: "Log a Result", desc: "Add a new match result", disabled: !isViewingActive },
              { key: "squad", icon: "🏃", accent: THEME.pitch, title: "Squad", desc: "Players, squad numbers, photos" },
              { key: "teams", icon: "👥", accent: THEME.amber, title: "Teams", desc: "Opposition club list & badges" },
              { key: "report", icon: "📊", accent: "#c084fc", title: "Report", desc: "Season stats & shareable image" },
              { key: "seasons", icon: "🗓", accent: THEME.loss, title: "Season History", desc: "Past seasons, archive & switch" },
              { key: "branding", icon: "🎨", accent: THEME.sky, title: "Branding", desc: "Club colours, badge, name & slogan" },
              { key: "placements", icon: "🏆", accent: THEME.amber, title: "Trophy Cabinet", desc: "Set how a tournament finished" },
            ].map(item => (
              <button key={item.key} disabled={item.disabled} onClick={() => setMode(item.key)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, background: THEME.white, border: "none", borderLeft: `3px solid ${item.accent}`, borderRadius: 14, padding: "14px 16px", marginBottom: 10, boxShadow: "0 2px 8px rgba(18,23,46,0.05)", cursor: item.disabled ? "default" : "pointer", opacity: item.disabled ? 0.5 : 1, fontFamily: THEME.body, textAlign: "left" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: THEME.navy, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: THEME.navy }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: THEME.ink60, marginTop: 1 }}>{item.disabled ? "Switch to the current season first" : item.desc}</div>
                </div>
                <div style={{ color: THEME.ink30, fontSize: 18 }}>›</div>
              </button>
            ))}

            <div style={{ fontFamily: THEME.mono, fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", color: THEME.ink60, margin: "22px 0 10px" }}>Session</div>
            <button onClick={handleLockAdmin}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, background: THEME.white, border: "none", borderRadius: 14, padding: "14px 16px", boxShadow: "0 2px 8px rgba(18,23,46,0.05)", cursor: "pointer", fontFamily: THEME.body, textAlign: "left" }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🚪</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: THEME.navy }}>Exit Admin</div>
                <div style={{ fontSize: 11, color: THEME.ink60, marginTop: 1 }}>Back to the public view</div>
              </div>
            </button>
          </div>
        )}

        {/* ── RESULTS TAB ── */}
        {mode === "history" && (
          <div>
            <H2HPanel results={results} competitions={competitions} />
            <div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 20, flexWrap: "wrap" }}>
                {[
                  { label: "Played", val: filteredResults.length, color: THEME.navy },
                  { label: "Won", val: filteredResults.filter(r => r.result === "W").length, color: "#00c853" },
                  { label: "Drawn", val: filteredResults.filter(r => r.result === "D").length, color: "#ffab00" },
                  { label: "Lost", val: filteredResults.filter(r => r.result === "L").length, color: "#d50000" },
                  { label: "Goals", val: filteredResults.reduce((a, r) => a + (r.homeScore || 0), 0), color: THEME.sky },
                ].map(s => (
                  <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "10px 18px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", minWidth: 70, borderBottom: `3px solid ${s.color}` }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: 11, color: "#999", fontWeight: 700, letterSpacing: 1 }}>{s.label.toUpperCase()}</div>
                  </div>
                ))}
              </div>

              {filterComp !== "All" && viewingSeason?.placements?.[filterComp] && (() => {
                const meta = PLACEMENT_META[viewingSeason.placements[filterComp]] || { icon: "🏅", color: THEME.amber };
                return (
                  <div style={{ maxWidth: 520, margin: "0 auto 16px", background: `linear-gradient(135deg, ${THEME.navy}, ${THEME.navySoft})`, borderRadius: 16, padding: 16, textAlign: "center", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${THEME.amber}, transparent)` }} />
                    <div style={{ fontSize: 30, marginBottom: 6 }}>{meta.icon}</div>
                    <div style={{ fontFamily: THEME.display, fontWeight: 600, fontSize: 16, color: "#fff", letterSpacing: 0.5 }}>{viewingSeason.placements[filterComp]}</div>
                    <div style={{ fontFamily: THEME.mono, fontSize: 10, color: THEME.amber, letterSpacing: 1, textTransform: "uppercase", marginTop: 3 }}>{filterComp}</div>
                  </div>
                );
              })()}

              {filterComp !== "All" && compTypeOf(filterComp) === "tournament" && (() => {
                const tGames = seasonResults.filter(r => r.competition === filterComp);
                if (tGames.length === 0) return null;
                const dates = [...new Set(tGames.map(r => r.date))].sort((a, b) => new Date(a) - new Date(b));
                const dateLabel = dates.length > 1 ? `${dates[0]} – ${dates[dates.length - 1]}` : dates[0];
                const tp = viewingSeason?.placements?.[filterComp] || null;
                const wN = tGames.filter(r => r.result === "W").length, dN = tGames.filter(r => r.result === "D").length, lN = tGames.filter(r => r.result === "L").length;
                return (
                  <div style={{ maxWidth: 520, margin: "0 auto 16px" }}>
                    <button onClick={() => setShowTourShare(v => !v)}
                      style={{ width: "100%", background: "#fff", border: `1.5px solid ${THEME.ink30}`, borderRadius: 12, padding: "11px 14px", cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 13, color: THEME.navy, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      📸 {showTourShare ? "Hide tournament summary" : "Share tournament summary"}
                    </button>
                    {showTourShare && (
                      <div style={{ marginTop: 12 }}>
                        <TournamentCard cardRef={tourShareRef} name={filterComp} date={dateLabel} placement={tp} games={tGames.slice().sort((a, b) => new Date(a.date) - new Date(b.date) || a.id - b.id)} players={players} />
                        <div style={{ marginTop: 10 }}>
                          <SaveCardButton cardRef={tourShareRef} filename="tournament-summary.png" onSaved={() => showToast("📸 Card ready")}
                            shareText={`${tp ? (PLACEMENT_META[tp]?.icon || "🏆") + " " + tp + " — " : ""}${filterComp} · P${tGames.length} W${wN} D${dN} L${lN}`} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div style={{ display: "flex", justifyContent: "flex-end", maxWidth: 520, margin: "0 auto 12px" }}>
                <button onClick={() => setSortOrder(s => s === "desc" ? "asc" : "desc")}
                  style={{ background: "#fff", border: "1.5px solid #e0e0e0", borderRadius: 20, padding: "6px 14px", cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 12, color: "#555", letterSpacing: 1 }}>
                  {sortOrder === "desc" ? "↓ Newest First" : "↑ Oldest First"}
                </button>
              </div>
            </div>

            {filteredResults.length === 0 && <div style={{ textAlign: "center", padding: "40px 20px", color: "#bbb" }}><div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div><div style={{ fontSize: 16, fontWeight: 700, color: "#aaa", marginBottom: 6 }}>No results yet</div><div style={{ fontSize: 13 }}>Tap ➕ New to add your first result</div></div>}

            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 520, margin: "0 auto" }}>
              {filteredResults.map((m, idx) => {
                const cc = getCompColor(competitions, m.competition);
                const isSelected = selectedMatch === m.id;
                const showDay = filterComp !== "All" && compTypeOf(filterComp) === "tournament" && (idx === 0 || filteredResults[idx - 1].date !== m.date);
                const dayGames = showDay ? filteredResults.filter(x => x.date === m.date) : [];
                return (
                  <div key={m.id}>
                    {showDay && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: idx === 0 ? "0 0 8px" : "10px 0 8px", fontFamily: THEME.mono, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: THEME.ink60 }}>
                        <span>🎪 {m.date}</span><span style={{ flex: 1, height: 1, background: THEME.ink30 }} />
                        <span>{dayGames.length} {dayGames.length === 1 ? "game" : "games"} · W{dayGames.filter(x => x.result === "W").length} D{dayGames.filter(x => x.result === "D").length} L{dayGames.filter(x => x.result === "L").length}</span>
                      </div>
                    )}
                    <ScoreCard match={m} compColor={cc} onClick={() => setSelectedMatch(isSelected ? null : m.id)} photoCount={matchPhotosFor(m.id).length} />

                    {isSelected && (
                      <div style={{ background: "#f8faff", borderRadius: 12, marginTop: -8, marginBottom: 4, boxShadow: "0 4px 8px rgba(0,0,0,0.06)", overflow: "hidden" }}>
                        <div style={{ padding: "14px 16px 0" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                            <span style={{ fontFamily: THEME.mono, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: THEME.ink60 }}>
                              📷 Match Photos{matchPhotosFor(m.id).length > 0 ? ` (${matchPhotosFor(m.id).length})` : ""}
                            </span>
                            {isAdmin && (
                              <button onClick={() => { photoUploadTargetRef.current = m.id; photoUploadRef.current?.click(); }}
                                disabled={uploadingPhotosFor === m.id}
                                style={{ background: THEME.pitchSoft, border: "none", borderRadius: 8, padding: "5px 10px", cursor: uploadingPhotosFor === m.id ? "wait" : "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 11, color: THEME.pitch }}>
                                {uploadingPhotosFor === m.id ? "Uploading..." : "+ Add"}
                              </button>
                            )}
                          </div>
                          {matchPhotosFor(m.id).length > 0 ? (
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingBottom: 14 }}>
                              {matchPhotosFor(m.id).map((p, i) => (
                                <div key={p.id} onClick={() => setLightbox({ photos: matchPhotosFor(m.id), index: i, title: `vs ${m.opposition}` })}
                                  style={{ width: 64, height: 64, borderRadius: 10, backgroundImage: `url(${p.url})`, backgroundSize: "cover", backgroundPosition: "center", cursor: "pointer", flexShrink: 0 }} />
                              ))}
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: THEME.ink30, paddingBottom: 14 }}>No photos yet</div>
                          )}
                        </div>
                        {isAdmin && (
                          <div style={{ display: "flex", borderTop: "1px solid #e8eeff" }}>
                            <button onClick={() => {
                                const initialGoalCounts = {};
                                (m.scorers || []).forEach(s => {
                                  const match = s.trim().match(/^(.+?)\s*[×x](\d+)$/);
                                  const name = match ? match[1].trim() : s.trim();
                                  const count = match ? parseInt(match[2]) : 1;
                                  const player = players.find(p => p.name === name);
                                  if (player) initialGoalCounts[player.id] = count;
                                });
                                setEditGoalCounts(initialGoalCounts);
                                setEditingResult({ ...m, scorers: (m.scorers || []).join(", ") });
                              }}
                              style={{ flex: 1, padding: "12px", background: "none", border: "none", borderRight: "1px solid #e8eeff", cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 13, color: THEME.navy, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                              ✏️ Edit
                            </button>
                            <button onClick={() => { if (window.confirm(`Delete result vs ${m.opposition}?`)) handleDeleteResult(m.id); }}
                              style={{ flex: 1, padding: "12px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 13, color: "#d50000", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                              🗑️ Delete
                            </button>
                          </div>
                        )}
                        <div style={{ padding: 16 }}>
                          <ResultCard match={m} teamName={viewingSeason?.age_group} compColor={getCompColor(competitions, m.competition)} players={players} teams={teams} onOpenPlayer={openPlayerProfile} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Edit modal */}
            {editingResult && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                    <span style={{ fontSize: 18, fontWeight: 900, color: THEME.navy, letterSpacing: 1 }}>✏️ EDIT RESULT</span>
                    <button onClick={() => { setEditingResult(null); setEditOppLogo(null); }} style={{ background: "#f0f0f0", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 800, fontSize: 14, color: "#888", fontFamily: "inherit" }}>✕</button>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Competition</label>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {[...new Set([...competitions, editingResult.competition].filter(Boolean))].map(comp => (
                        <button key={comp} onClick={() => setEditingResult(r => ({ ...r, competition: comp }))}
                          style={{ padding: "6px 12px", borderRadius: 20, border: editingResult.competition === comp ? "none" : "1.5px solid #e0e0e0", background: editingResult.competition === comp ? THEME.navy : "#fff", color: editingResult.competition === comp ? THEME.sky : "#888", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase" }}>
                          {comp}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Date Played</label>
                    <input type="date" value={editingResult.date || ""} onChange={e => setEditingResult(r => ({ ...r, date: e.target.value }))} style={{ ...inputStyle, colorScheme: "light" }} />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Opposition</label>
                    <TeamPicker teams={teams} value={editingResult.opposition} onChange={v => setEditingResult(r => ({ ...r, opposition: v }))} onAddNew={name => { handleAddTeam(name); setEditingResult(r => ({ ...r, opposition: name })); }} />
                  </div>
                  {[
                    { label: `${BRAND.short} Score`, key: "homeScore", type: "number" },
                    { label: "Opposition Score", key: "awayScore", type: "number" },
                  ].map(field => (
                    <div key={field.key} style={{ marginBottom: 14 }}>
                      <label style={labelStyle}>{field.label}</label>
                      <input type={field.type} value={editingResult[field.key]} onChange={e => setEditingResult(r => ({ ...r, [field.key]: e.target.value }))} style={inputStyle} />
                    </div>
                  ))}
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Goal Scorers</label>
                    {players.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {players.map(p => {
                          const count = editGoalCounts[p.id] || 0;
                          return (
                            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, background: count > 0 ? "#f0f4ff" : "#f7f8fa", borderRadius: 10, padding: "8px 12px", border: count > 0 ? `1.5px solid ${THEME.sky}` : "1.5px solid #e8e8e8" }}>
                              <div style={{ width: 28, height: 28, borderRadius: "50%", background: p.photo ? "transparent" : THEME.navy, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                                {p.photo ? <img src={p.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <span style={{ color: THEME.sky, fontSize: 9, fontWeight: 900 }}>{p.name.slice(0,2).toUpperCase()}</span>}
                              </div>
                              <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: THEME.navy }}>{p.name}</span>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <button onClick={() => setEditGoalCounts(prev => ({ ...prev, [p.id]: Math.max(0, (prev[p.id] || 0) - 1) }))}
                                  style={{ width: 28, height: 28, borderRadius: "50%", border: "1.5px solid #e0e0e0", background: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontFamily: "inherit" }}>−</button>
                                <span style={{ fontSize: 18, fontWeight: 900, color: THEME.navy, minWidth: 18, textAlign: "center" }}>{count}</span>
                                <button onClick={() => setEditGoalCounts(prev => ({ ...prev, [p.id]: (prev[p.id] || 0) + 1 }))}
                                  style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: THEME.navy, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: THEME.sky, fontFamily: "inherit" }}>+</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <input type="text" value={typeof editingResult.scorers === "string" ? editingResult.scorers : (editingResult.scorers || []).join(", ")} onChange={e => setEditingResult(r => ({ ...r, scorers: e.target.value }))} style={inputStyle} />
                    )}
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Stage (optional)</label>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {[...new Set([...STAGES, editingResult.round].filter(Boolean))].map(st => (
                        <button key={st} onClick={() => setEditingResult(r => ({ ...r, round: r.round === st ? "" : st }))}
                          style={{ padding: "6px 12px", borderRadius: 20, border: editingResult.round === st ? "none" : "1.5px solid #e0e0e0", background: editingResult.round === st ? THEME.navy : "#fff", color: editingResult.round === st ? THEME.sky : "#888", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{st}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Season</label>
                    <select value={editingResult.season_id || ""} onChange={e => setEditingResult(r => ({ ...r, season_id: parseInt(e.target.value) }))}
                      style={{ ...inputStyle, colorScheme: "light" }}>
                      {seasons.map(s => <option key={s.id} value={s.id}>{s.name}{s.age_group ? ` — ${s.age_group}` : ""}{s.is_active ? " (Current)" : ""}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>⭐ Man of Match</label>
                    <input type="text" value={editingResult.motm || ""} onChange={e => setEditingResult(r => ({ ...r, motm: e.target.value }))} style={inputStyle} placeholder="Type or select below" />
                    {players.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                        {players.map(p => (
                          <button key={p.id} onClick={() => setEditingResult(r => ({ ...r, motm: r.motm === p.name ? "" : p.name }))}
                            style={{ padding: "4px 10px", borderRadius: 16, border: editingResult.motm === p.name ? "none" : "1.5px solid #e0e0e0", background: editingResult.motm === p.name ? "#ffd700" : "#fff", color: editingResult.motm === p.name ? THEME.navy : "#888", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                            {p.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ ...labelStyle, color: "#aaa" }}>🏅 Opp MOTM</label>
                    <input type="text" value={editingResult.oppMotm || ""} onChange={e => setEditingResult(r => ({ ...r, oppMotm: e.target.value }))} style={inputStyle} placeholder="Opposition player name" />
                    {players.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                        {players.map(p => (
                          <button key={p.id} onClick={() => setEditingResult(r => ({ ...r, oppMotm: r.oppMotm === p.name ? "" : p.name }))}
                            style={{ padding: "4px 10px", borderRadius: 16, border: editingResult.oppMotm === p.name ? "none" : "1.5px solid #e0e0e0", background: editingResult.oppMotm === p.name ? "#ff7eb3" : "#fff", color: editingResult.oppMotm === p.name ? "#fff" : "#888", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                            {p.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={handleSaveEdit} style={{ width: "100%", padding: "15px", background: THEME.navy, color: THEME.sky, border: "none", borderRadius: 12, fontSize: 16, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}>Save Changes</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── GALLERY TAB ── */}
        {mode === "gallery" && (
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            {(() => {
              const groups = seasonResults
                .map(m => ({ match: m, photos: matchPhotosFor(m.id) }))
                .filter(g => g.photos.length > 0);
              if (groups.length === 0) {
                return (
                  <div style={{ textAlign: "center", padding: "60px 20px", color: "#bbb" }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#aaa", marginBottom: 6 }}>No photos yet</div>
                    <div style={{ fontSize: 13 }}>{isAdmin ? "Add some from a result in the Results tab." : "Match photos will show up here once they're added."}</div>
                  </div>
                );
              }
              return groups.map(g => (
                <div key={g.match.id} style={{ marginBottom: 22 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                    <span style={{ fontFamily: THEME.display, fontWeight: 600, fontSize: 14, color: THEME.navy }}>vs {(g.match.opposition || "").toUpperCase()}</span>
                    <span style={{ fontFamily: THEME.mono, fontSize: 10, color: THEME.ink60 }}>{g.match.date}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 5 }}>
                    {g.photos.map((p, i) => (
                      <div key={p.id} onClick={() => setLightbox({ photos: g.photos, index: i, title: `vs ${g.match.opposition}` })}
                        style={{ aspectRatio: "1", borderRadius: 8, backgroundImage: `url(${p.url})`, backgroundSize: "cover", backgroundPosition: "center", cursor: "pointer" }} />
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        )}

        {/* ── PLAYERS TAB ── */}
        {mode === "scorers" && (
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            <div style={{ display: "flex", background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", marginBottom: 20 }}>
              {[{ key: "squad", label: "🏃 Squad" }, { key: "goals", label: "⚽ Goals" }, { key: "motm", label: "⭐ MOTM" }, { key: "oppmotm", label: "🏅 Opp MOTM" }].map(st => (
                <button key={st.key} onClick={() => setScorersTab(st.key)}
                  style={{ flex: 1, padding: "12px 4px", border: "none", background: scorersTab === st.key ? THEME.navy : "none", color: scorersTab === st.key ? THEME.sky : "#999", fontWeight: 800, fontSize: 11, letterSpacing: 0.5, cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase" }}>
                  {st.label}
                </button>
              ))}
            </div>

            {scorersTab === "squad" ? (
              (() => {
                const activePlayers = players.filter(p => p.is_active !== false);
                const appCounts = appearanceCountBySeason(viewingSeason?.id);
                const goalBoard = buildGoalBoard(seasonResults);
                return activePlayers.length === 0 ? (
                  <p style={{ textAlign: "center", color: "#bbb", fontSize: 14, marginTop: 40 }}>No active players yet.</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {activePlayers.map(p => {
                      const apps = appCounts[p.id] || 0;
                      const goals = goalBoard.find(g => g.name === p.name)?.count || 0;
                      return (
                        <button key={p.id} onClick={() => openPlayerProfile(p.name)}
                          style={{ background: "#fff", border: "none", borderRadius: 14, padding: "14px 10px", textAlign: "center", boxShadow: "0 2px 8px rgba(18,23,46,0.06)", cursor: "pointer", fontFamily: "inherit" }}>
                          <div style={{ width: 52, height: 52, borderRadius: "50%", background: THEME.navy, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", position: "relative", overflow: "hidden" }}>
                            {p.photo
                              ? <img src={p.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={p.name} />
                              : <span style={{ color: THEME.sky, fontFamily: THEME.display, fontWeight: 600, fontSize: 16 }}>{p.name.slice(0,2).toUpperCase()}</span>}
                            <span style={{ position: "absolute", bottom: -3, right: -3, background: "#ffd700", color: "#3a2a05", fontFamily: THEME.mono, fontSize: 9, fontWeight: 700, width: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>{p.squad_number || "?"}</span>
                          </div>
                          <div style={{ fontFamily: THEME.display, fontWeight: 600, fontSize: 13, color: THEME.navy }}>{p.name}</div>
                          <div style={{ fontFamily: THEME.mono, fontSize: 10, color: "#888", marginTop: 2 }}>{apps} apps{goals > 0 ? ` · ${goals} goals` : ""}</div>
                        </button>
                      );
                    })}
                  </div>
                );
              })()
            ) : (
              <>
                <div style={{ background: THEME.navy, borderRadius: 14, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>
                  {[
                    { label: "Total Goals", val: filteredResults.reduce((a, r) => a + (r.homeScore || 0), 0) },
                    { label: "Scorers", val: buildGoalBoard(filteredResults).length },
                    { label: "Win Rate", val: `${filteredResults.filter(r => r.result === "W").length}/${filteredResults.length}` },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: "center" }}>
                      <div style={{ color: THEME.sky, fontSize: 28, fontWeight: 900 }}>{s.val}</div>
                      <div style={{ color: "#aaa", fontSize: 10, fontWeight: 700, letterSpacing: 2 }}>{s.label.toUpperCase()}</div>
                    </div>
                  ))}
                </div>
                {scorersTab === "goals" && <Leaderboard data={buildGoalBoard(filteredResults)} label="Top Goal Scorers" emptyMsg="No goals recorded yet." filterLabel={filterComp === "All" ? "All Competitions" : filterComp} accentColor={THEME.sky} onRowClick={openPlayerProfile} />}
                {scorersTab === "motm" && <Leaderboard data={buildAwardBoard(filteredResults, "motm")} label="Man of the Match" emptyMsg="No MOTM awards yet." filterLabel={filterComp === "All" ? "All Competitions" : filterComp} accentColor="#ffd700" onRowClick={openPlayerProfile} />}
                {scorersTab === "oppmotm" && <Leaderboard data={buildAwardBoard(filteredResults, "oppMotm")} label="Opposition MOTM" emptyMsg="No Opp. MOTM awards yet." filterLabel={filterComp === "All" ? "All Competitions" : filterComp} accentColor="#ff7eb3" />}
              </>
            )}
            <p style={{ textAlign: "center", color: "#bbb", fontSize: 12, marginTop: 14, letterSpacing: 1 }}>{BRAND.name.toUpperCase()} {(viewingSeason?.age_group || "").toUpperCase()}</p>
          </div>
        )}

        {/* ── TEAMS TAB ── */}
        {mode === "teams" && isAdmin && (
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            {/* Search / H2H */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Search Teams / View Head-to-Head</label>
              <input type="text" placeholder="Search for a team..." value={teamSearch} onChange={e => { setTeamSearch(e.target.value); setH2hTeam(null); }}
                style={inputStyle} />
            </div>

            {/* H2H results */}
            {h2hTeam && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#888", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Results vs {h2hTeam}</div>
                {h2hResults.length === 0
                  ? <p style={{ textAlign: "center", color: "#bbb", fontSize: 14 }}>No results against this team yet.</p>
                  : (
                    <>
                      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 14, flexWrap: "wrap" }}>
                        {[
                          { label: "Played", val: h2hResults.length, color: THEME.navy },
                          { label: "Won", val: h2hResults.filter(r => r.result === "W").length, color: "#00c853" },
                          { label: "Drawn", val: h2hResults.filter(r => r.result === "D").length, color: "#ffab00" },
                          { label: "Lost", val: h2hResults.filter(r => r.result === "L").length, color: "#d50000" },
                        ].map(s => (
                          <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "8px 14px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", borderBottom: `3px solid ${s.color}` }}>
                            <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.val}</div>
                            <div style={{ fontSize: 11, color: "#999", fontWeight: 700 }}>{s.label.toUpperCase()}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {h2hResults.map(m => (
                          <div key={m.id} style={{ background: "#fff", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", borderLeft: `4px solid ${m.result === "W" ? "#00c853" : m.result === "L" ? "#d50000" : "#ffab00"}` }}>
                            <span style={{ background: m.result === "W" ? "#00c853" : m.result === "L" ? "#d50000" : "#ffab00", color: "#fff", fontWeight: 800, fontSize: 13, borderRadius: 8, padding: "3px 8px" }}>{m.result}</span>
                            <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: THEME.navy }}>{m.homeScore}–{m.awayScore}</span>
                            <span style={{ fontSize: 12, color: "#aaa" }}>{m.date}</span>
                            <span style={{ fontSize: 11, color: getCompColor(competitions, m.competition), fontWeight: 700, background: "#f5f5f5", borderRadius: 8, padding: "2px 8px" }}>{m.competition}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                <button onClick={() => { setH2hTeam(null); setTeamSearch(""); }} style={{ marginTop: 12, background: "none", border: "1.5px solid #e0e0e0", borderRadius: 10, padding: "10px", width: "100%", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 14, color: "#888" }}>← Back to Teams</button>
              </div>
            )}

            {/* Teams list */}
            {!h2hTeam && (
              <>
                {/* Hidden file input for team logo upload */}
                <input ref={teamLogoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                  const file = e.target.files[0];
                  if (!file || !uploadingLogoForTeam) return;
                  const reader = new FileReader();
                  reader.onload = async ev => {
                    const logo = ev.target.result;
                    const team = teams.find(t => t.id === uploadingLogoForTeam);
                    if (!team) return;
                    const updated = { ...team, logo };
                    try { await updateTeam(updated); } catch(e) {}
                    setTeams(prev => prev.map(t => t.id === updated.id ? updated : t));
                    setUploadingLogoForTeam(null);
                  };
                  reader.readAsDataURL(file);
                }} />

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                  {teams.filter(t => t.name.toLowerCase().includes(teamSearch.toLowerCase())).map(t => (
                    <div key={t.id} style={{ background: "#fff", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                      {/* Logo — tap to upload */}
                      <button onClick={() => { setUploadingLogoForTeam(t.id); teamLogoRef.current.click(); }}
                        title="Upload logo"
                        style={{ width: 44, height: 44, borderRadius: 10, background: "#f0f4ff", border: `1.5px dashed ${THEME.sky}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", padding: 0 }}>
                        {t.logo
                          ? <img src={t.logo} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt={t.name} />
                          : <span style={{ fontSize: 20 }}>⚽</span>}
                      </button>
                      {editingTeam?.id === t.id ? (
                        <div style={{ display: "flex", gap: 6, flex: 1, alignItems: "center" }}>
                          <input autoFocus value={editingTeamNameVal} onChange={e => setEditingTeamNameVal(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") { handleRenameTeam(t.id, editingTeamNameVal); setEditingTeam(null); } if (e.key === "Escape") setEditingTeam(null); }}
                            style={{ flex: 1, border: `2px solid ${THEME.sky}`, borderRadius: 8, padding: "7px 10px", fontSize: 15, fontFamily: "inherit", fontWeight: 700, color: THEME.navy, outline: "none" }} />
                          <button onClick={() => { handleRenameTeam(t.id, editingTeamNameVal); setEditingTeam(null); }}
                            style={{ background: THEME.navy, color: THEME.sky, border: "none", borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 13 }}>✓</button>
                          <button onClick={() => setEditingTeam(null)}
                            style={{ background: "#f0f0f0", color: "#888", border: "none", borderRadius: 8, padding: "7px 10px", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>✕</button>
                        </div>
                      ) : (
                        <>
                          <span style={{ flex: 1, fontSize: 16, fontWeight: 800, color: THEME.navy }}>{t.name}</span>
                          <button onClick={() => { setH2hTeam(t.name); setTeamSearch(t.name); }}
                            style={{ background: "#f0f4ff", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 12, color: THEME.sky }}>H2H</button>
                          <button onClick={() => { setEditingTeam(t); setEditingTeamNameVal(t.name); }}
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#aaa" }}>✏️</button>
                          <button onClick={() => { if (window.confirm(`Remove ${t.name}?`)) handleDeleteTeam(t.id); }}
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#ddd" }}>🗑️</button>
                        </>
                      )}
                    </div>
                  ))}
                  {teams.length === 0 && <p style={{ textAlign: "center", color: "#bbb", fontSize: 14 }}>No teams added yet. Teams are added automatically when you enter results.</p>}
                </div>
                <p style={{ textAlign: "center", color: "#bbb", fontSize: 12, marginBottom: 12 }}>Tap the badge icon on any team to upload their logo</p>
                <button onClick={() => handleAddTeam(teamSearch || "New Team")}
                  style={{ width: "100%", padding: "13px", background: THEME.navy, color: THEME.sky, border: "none", borderRadius: 12, fontSize: 15, fontWeight: 800, letterSpacing: 1, cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase" }}>
                  + Add Team Manually
                </button>
              </>
            )}
          </div>
        )}

        {/* ── NEW RESULT TAB ── */}
        {mode === "new" && isAdmin && (
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            {!newResult ? (
              <div style={{ ...cardStyle }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: THEME.navy, marginBottom: 20, letterSpacing: 1 }}>🏆 POST A RESULT</div>

                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>What kind of game?</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", background: "#f0f2f6", borderRadius: 12, padding: 4, gap: 3 }}>
                    {COMP_TYPES.map(t => (
                      <button key={t.key} onClick={() => chooseLogType(t.key)}
                        style={{ border: "none", borderRadius: 9, padding: "9px 2px", background: logType === t.key ? THEME.navy : "none", color: logType === t.key ? "#fff" : "#8a90a3", fontWeight: 800, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}>
                        <span style={{ display: "block", fontSize: 16, marginBottom: 2 }}>{t.icon}</span>{t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {logType === "tournament" ? renderTournamentDay() : (<>
                {logType !== "friendly" && (
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>{logType === "cup" ? "Which cup?" : logType === "friendly" ? "Friendly" : "Which league?"}</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                    {compsOfType(logType).map(comp => (
                      <button key={comp} onClick={() => setForm(f => ({ ...f, competition: comp }))}
                        style={{ padding: "7px 14px", borderRadius: 20, border: form.competition === comp ? "none" : "1.5px solid #e0e0e0", background: form.competition === comp ? THEME.navy : "#fff", color: form.competition === comp ? THEME.sky : "#888", fontWeight: 800, fontSize: 12, letterSpacing: 1, cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase" }}>
                        {comp}
                      </button>
                    ))}
                    {!addingComp && (
                      <button onClick={() => setAddingComp(true)} style={{ padding: "7px 14px", borderRadius: 20, border: `1.5px dashed ${THEME.sky}`, background: "#fff", color: THEME.skyInk, fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>+ New</button>
                    )}
                  </div>
                  {addingComp && (
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <input autoFocus placeholder="Competition name..." value={newCompName} onChange={e => setNewCompName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleAddComp(); if (e.key === "Escape") setAddingComp(false); }} style={{ ...inputStyle, flex: 1, padding: "10px 14px" }} />
                      <button onClick={handleAddComp} style={{ background: THEME.navy, color: THEME.sky, border: "none", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontWeight: 800, fontFamily: "inherit", fontSize: 13 }}>Add</button>
                      <button onClick={() => setAddingComp(false)} style={{ background: "#f0f0f0", color: "#888", border: "none", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>✕</button>
                    </div>
                  )}
                </div>
                )}

                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Date Played</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ ...inputStyle, colorScheme: "light" }} />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Opposition</label>
                  <TeamPicker teams={teams} value={form.opposition} onChange={v => setForm(f => ({ ...f, opposition: v }))} onAddNew={name => { handleAddTeam(name); setForm(f => ({ ...f, opposition: name })); }} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>{BRAND.short} Score</label>
                    {scoreFromScorers ? (
                      <>
                        <div style={{ ...inputStyle, display: "flex", alignItems: "center", background: "#f0f2f6", color: THEME.navy, fontWeight: 800, fontSize: 20 }}>{leonGoals}</div>
                        <div style={{ fontSize: 10, color: THEME.ink60, marginTop: 4 }}>Counted from goal scorers below</div>
                      </>
                    ) : (
                      <input type="number" placeholder="" value={form.homeScore} onChange={e => setForm(f => ({ ...f, homeScore: e.target.value }))} style={inputStyle} />
                    )}
                  </div>
                  <div>
                    <label style={labelStyle}>Opp Score</label>
                    <input type="number" placeholder="" value={form.awayScore} onChange={e => setForm(f => ({ ...f, awayScore: e.target.value }))} style={inputStyle} />
                  </div>
                </div>

                {logType === "cup" && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Stage (optional)</label>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {STAGES.filter(x => x !== "Group stage").map(st => (
                        <button key={st} onClick={() => setForm(f => ({ ...f, round: f.round === st ? "" : st }))}
                          style={{ padding: "7px 14px", borderRadius: 20, border: form.round === st ? "none" : "1.5px solid #e0e0e0", background: form.round === st ? THEME.navy : "#fff", color: form.round === st ? THEME.sky : "#888", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{st}</button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Season</label>
                  <select value={form.season_id || activeSeason?.id || ""} onChange={e => setForm(f => ({ ...f, season_id: parseInt(e.target.value) }))}
                    style={{ ...inputStyle, colorScheme: "light" }}>
                    {seasons.map(s => <option key={s.id} value={s.id}>{s.name}{s.age_group ? ` — ${s.age_group}` : ""}{s.is_active ? " (Current)" : ""}</option>)}
                  </select>
                </div>

                {players.length > 0 ? (
                  <>
                    {/* Who played */}
                    <div style={{ marginBottom: 16 }}>
                      <label style={labelStyle}>Who Played Today?</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {players.filter(p => p.is_active !== false).map(p => {
                          const selected = selectedSquad.includes(p.id);
                          return (
                            <button key={p.id} onClick={() => {
                              setSelectedSquad(prev => selected ? prev.filter(id => id !== p.id) : [...prev, p.id]);
                              if (selected) {
                                setGoalCounts(prev => { const n = { ...prev }; delete n[p.id]; return n; });
                                if (motmPlayerId === p.id) setMotmPlayerId(null);
                                if (oppMotmPlayerId === p.id) setOppMotmPlayerId(null);
                              }
                            }}
                              style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20, border: selected ? "none" : "1.5px solid #e0e0e0", background: selected ? THEME.navy : "#fff", color: selected ? THEME.sky : "#888", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                              <span style={{ fontWeight: 900, fontSize: 11, color: selected ? THEME.sky : "#aaa" }}>#{p.squad_number || "?"}</span>
                              {p.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Goal counters */}
                    {selectedSquad.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <label style={labelStyle}>Goal Scorers</label>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {selectedSquad.map(pid => {
                            const p = players.find(pl => pl.id === pid);
                            if (!p) return null;
                            const count = goalCounts[pid] || 0;
                            return (
                              <div key={pid} style={{ display: "flex", alignItems: "center", gap: 12, background: count > 0 ? "#f0f4ff" : "#f7f8fa", borderRadius: 10, padding: "10px 14px", border: count > 0 ? `1.5px solid ${THEME.sky}` : "1.5px solid #e8e8e8" }}>
                                <div style={{ width: 32, height: 32, borderRadius: "50%", background: p.photo ? "transparent" : THEME.navy, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                                  {p.photo ? <img src={p.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <span style={{ color: THEME.sky, fontSize: 10, fontWeight: 900 }}>{p.name.slice(0,2).toUpperCase()}</span>}
                                </div>
                                <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: THEME.navy }}>{p.name}</span>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <button onClick={() => setGoalCounts(prev => ({ ...prev, [pid]: Math.max(0, (prev[pid] || 0) - 1) }))}
                                    style={{ width: 32, height: 32, borderRadius: "50%", border: "1.5px solid #e0e0e0", background: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontFamily: "inherit" }}>−</button>
                                  <span style={{ fontSize: 20, fontWeight: 900, color: THEME.navy, minWidth: 20, textAlign: "center" }}>{count}</span>
                                  <button onClick={() => setGoalCounts(prev => ({ ...prev, [pid]: (prev[pid] || 0) + 1 }))}
                                    style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: THEME.navy, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: THEME.sky, fontFamily: "inherit" }}>+</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* MOTM picker */}
                    {selectedSquad.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <label style={labelStyle}>⭐ Man of the Match</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {selectedSquad.map(pid => {
                            const p = players.find(pl => pl.id === pid);
                            if (!p) return null;
                            const selected = motmPlayerId === pid;
                            return (
                              <button key={pid} onClick={() => setMotmPlayerId(selected ? null : pid)}
                                style={{ padding: "6px 14px", borderRadius: 20, border: selected ? "none" : "1.5px solid #e0e0e0", background: selected ? "#ffd700" : "#fff", color: selected ? THEME.navy : "#888", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                                {selected ? "⭐ " : ""}{p.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Opp MOTM — only show when squad selected */}
                    {selectedSquad.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <label style={{ ...labelStyle, color: "#aaa" }}>🏅 Opp. Man of Match</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {selectedSquad.map(pid => {
                            const p = players.find(pl => pl.id === pid);
                            if (!p) return null;
                            const selected = oppMotmPlayerId === pid;
                            return (
                              <button key={pid} onClick={() => setOppMotmPlayerId(selected ? null : pid)}
                                style={{ padding: "6px 14px", borderRadius: 20, border: selected ? "none" : "1.5px solid #e0e0e0", background: selected ? "#ff7eb3" : "#fff", color: selected ? "#fff" : "#888", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                                {selected ? "🏅 " : ""}{p.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Fallback text fields if no squad set up yet */}
                    <div style={{ marginBottom: 16 }}>
                      <label style={labelStyle}>Goal Scorers (comma separated)</label>
                      <input type="text" placeholder="e.g. Grayson, Kayson ×2, Reggie" value={form.scorers} onChange={e => setForm(f => ({ ...f, scorers: e.target.value }))} style={inputStyle} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                      <div>
                        <label style={labelStyle}>⭐ Man of Match</label>
                        <input type="text" placeholder="e.g. Grayson" value={form.motm} onChange={e => setForm(f => ({ ...f, motm: e.target.value }))} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, color: "#aaa" }}>🏅 Opp MOTM</label>
                        <input type="text" placeholder="e.g. Smith" value={form.oppMotm} onChange={e => setForm(f => ({ ...f, oppMotm: e.target.value }))} style={inputStyle} />
                      </div>
                    </div>
                  </>
                )}

                <button onClick={handleCreate} disabled={!form.date || !form.opposition || (!scoreFromScorers && form.homeScore === "") || form.awayScore === ""}
                  style={{ width: "100%", padding: "16px", background: THEME.navy, color: THEME.sky, border: "none", borderRadius: 12, fontSize: 17, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", opacity: (!form.date || !form.opposition || form.homeScore === "" || form.awayScore === "") ? 0.5 : 1 }}>
                  Generate Result Card
                </button>
                </>)}
              </div>
            ) : (
              <div>
                <ResultCard match={newResult} teamName={viewingSeason?.age_group} compColor={getCompColor(competitions, newResult.competition)} players={players} teams={teams} />
                <button onClick={() => { setNewResult(null); setOppLogo(null); setSelectedSquad([]); setGoalCounts({}); setMotmPlayerId(null); setOppMotmPlayerId(null); setForm({ date: "", opposition: "", homeScore: "", awayScore: "", scorers: "", competition: form.competition, motm: "", oppMotm: "", round: "", season_id: activeSeason?.id || null }); }}
                  style={{ marginTop: 16, width: "100%", padding: "14px", background: "#fff", color: THEME.navy, border: "2px solid #e8e8e8", borderRadius: 12, fontSize: 15, fontWeight: 800, letterSpacing: 2, cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase" }}>
                  ← Add Another Result
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── SQUAD TAB ── */}
        {mode === "squad" && isAdmin && (
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            {(() => {
              const activePlayers = players.filter(p => p.is_active !== false);
              const inactivePlayers = players.filter(p => p.is_active === false);
              const appCounts = appearanceCountBySeason(viewingSeason?.id);
              const goalBoard = buildGoalBoard(seasonResults);
              const motmBoard = buildAwardBoard(seasonResults, "motm");
              const renderRow = (p, inactive) => {
                const apps = appCounts[p.id] || 0;
                const goals = goalBoard.find(g => g.name === p.name)?.count || 0;
                const motms = motmBoard.find(m => m.name === p.name)?.count || 0;
                return (
                  <div key={p.id} style={{ background: "#fff", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", opacity: inactive ? 0.55 : 1 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: p.photo ? "transparent" : THEME.navy, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      {p.photo
                        ? <img src={p.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={p.name} />
                        : <span style={{ color: THEME.sky, fontSize: 14, fontWeight: 900 }}>{p.name.slice(0,2).toUpperCase()}</span>
                      }
                    </div>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: "#f0f4ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 900, color: THEME.navy }}>{p.squad_number || "—"}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: THEME.navy }}>{p.name}</div>
                      <div style={{ display: "flex", gap: 10, marginTop: 3, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, color: "#888" }}>📅 {apps} apps</span>
                        {goals > 0 && <span style={{ fontSize: 11, color: THEME.skyInk }}>⚽ {goals} goals</span>}
                        {motms > 0 && <span style={{ fontSize: 11, color: "#ffd700" }}>⭐ {motms} MOTM</span>}
                      </div>
                    </div>
                    <button onClick={() => handleTogglePlayerActive(p)}
                      style={{ background: "none", border: "none", cursor: "pointer", fontFamily: THEME.mono, fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: inactive ? THEME.ink60 : THEME.pitch, flexShrink: 0, whiteSpace: "nowrap" }}>
                      {inactive ? "Restore" : "Active"}
                    </button>
                    <button onClick={() => { setEditingPlayer(p); setPlayerForm({ name: p.name, squad_number: p.squad_number || "", photo: p.photo || null }); setShowPlayerModal(true); }}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#aaa", flexShrink: 0 }}>✏️</button>
                    <button onClick={() => { if (window.confirm(`Permanently remove ${p.name} from squad?`)) handleDeletePlayer(p.id); }}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#ddd", flexShrink: 0 }}>🗑️</button>
                  </div>
                );
              };
              return (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#888", letterSpacing: 2, textTransform: "uppercase" }}>
                      {activePlayers.length} Active{viewingSeason?.age_group ? ` — ${viewingSeason.age_group}` : ""}
                    </span>
                    <button onClick={() => { setShowPlayerModal(true); setEditingPlayer(null); setPlayerForm({ name: "", squad_number: "", photo: null }); }}
                      style={{ background: THEME.navy, color: THEME.sky, border: "none", borderRadius: 10, padding: "8px 16px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                      + Add Player
                    </button>
                  </div>

                  {players.length === 0 && <p style={{ textAlign: "center", color: "#bbb", fontSize: 14, marginTop: 40 }}>No players added yet. Tap + Add Player to get started.</p>}

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {activePlayers.map(p => renderRow(p, false))}
                  </div>

                  {inactivePlayers.length > 0 && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#aaa", letterSpacing: 2, textTransform: "uppercase", margin: "20px 0 10px" }}>
                        Inactive — {inactivePlayers.length}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {inactivePlayers.map(p => renderRow(p, true))}
                      </div>
                    </>
                  )}
                </>
              );
            })()}

            {/* Player modal */}
            {showPlayerModal && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 400 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                    <span style={{ fontSize: 18, fontWeight: 900, color: THEME.navy }}>{editingPlayer ? "✏️ EDIT PLAYER" : "➕ ADD PLAYER"}</span>
                    <button onClick={() => { setShowPlayerModal(false); setEditingPlayer(null); }} style={{ background: "#f0f0f0", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 800, fontSize: 14, color: "#888", fontFamily: "inherit" }}>✕</button>
                  </div>

                  {/* Photo */}
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                    <div style={{ width: 64, height: 64, borderRadius: "50%", background: playerForm.photo ? "transparent" : "#f0f4ff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, border: `2px dashed ${THEME.sky}` }}>
                      {playerForm.photo
                        ? <img src={playerForm.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                        : <span style={{ fontSize: 24 }}>📷</span>
                      }
                    </div>
                    <div>
                      <input ref={playerPhotoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={async e => {
                        const file = e.target.files[0]; if (!file) return;
                        setUploadingPlayerPhoto(true);
                        try {
                          const url = await uploadImage(file, "players");
                          setPlayerForm(f => ({ ...f, photo: url }));
                        } catch (err) {
                          showToast("⚠️ Couldn't upload that photo");
                        }
                        setUploadingPlayerPhoto(false);
                        e.target.value = "";
                      }} />
                      <button onClick={() => playerPhotoRef.current.click()} disabled={uploadingPlayerPhoto}
                        style={{ background: "#f0f4ff", border: `1.5px solid ${THEME.sky}`, borderRadius: 8, padding: "6px 14px", cursor: uploadingPlayerPhoto ? "wait" : "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 12, color: THEME.sky, display: "block", marginBottom: 6, opacity: uploadingPlayerPhoto ? 0.6 : 1 }}>
                        {uploadingPlayerPhoto ? "Uploading..." : playerForm.photo ? "Change photo" : "Add photo (optional)"}
                      </button>
                      {playerForm.photo && !uploadingPlayerPhoto && <button onClick={() => setPlayerForm(f => ({ ...f, photo: null }))} style={{ background: "none", border: "none", color: "#d50000", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>✕ Remove</button>}
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: THEME.skyInk, letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>Player Name</label>
                    <input type="text" placeholder="e.g. Grayson" value={playerForm.name} onChange={e => setPlayerForm(f => ({ ...f, name: e.target.value }))}
                      style={{ width: "100%", padding: "12px 14px", border: "2px solid #e8e8e8", borderRadius: 10, fontSize: 16, fontFamily: "inherit", fontWeight: 600, color: THEME.navy, outline: "none", boxSizing: "border-box" }} />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: THEME.skyInk, letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>Squad Number</label>
                    <input type="number" placeholder="e.g. 7" value={playerForm.squad_number} onChange={e => setPlayerForm(f => ({ ...f, squad_number: e.target.value }))}
                      style={{ width: "100%", padding: "12px 14px", border: "2px solid #e8e8e8", borderRadius: 10, fontSize: 16, fontFamily: "inherit", fontWeight: 600, color: THEME.navy, outline: "none", boxSizing: "border-box" }} />
                  </div>

                  <button onClick={handleSavePlayer} disabled={!playerForm.name.trim()}
                    style={{ width: "100%", padding: "15px", background: THEME.navy, color: THEME.sky, border: "none", borderRadius: 12, fontSize: 16, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", opacity: !playerForm.name.trim() ? 0.5 : 1 }}>
                    {editingPlayer ? "Save Changes" : "Add to Squad"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SEASON REPORT TAB ── */}
        {mode === "report" && isAdmin && (() => {
          const sResults = seasonResults;
          const wins = sResults.filter(r => r.result === "W").length;
          const draws = sResults.filter(r => r.result === "D").length;
          const losses = sResults.filter(r => r.result === "L").length;
          const totalGoals = sResults.reduce((a, r) => a + (r.homeScore || 0), 0);
          const goalBoard = buildGoalBoard(sResults).slice(0, 5);
          const biggestWin = sResults.filter(r => r.result === "W").sort((a, b) => (b.homeScore - b.awayScore) - (a.homeScore - a.awayScore))[0];
          const compBreakdown = [...new Set(sResults.map(r => r.competition).filter(Boolean))].map(comp => {
            const cr = sResults.filter(r => r.competition === comp);
            return { comp, p: cr.length, w: cr.filter(r => r.result === "W").length, d: cr.filter(r => r.result === "D").length, l: cr.filter(r => r.result === "L").length, gf: cr.reduce((a, r) => a + (r.homeScore || 0), 0) };
          });
          const appCounts = appearanceCountBySeason(viewingSeason?.id);

          return (
            <div style={{ maxWidth: 520, margin: "0 auto" }}>
              <div ref={reportRef} style={{ background: THEME.navy, borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.15)" }}>

                {/* Header */}
                <div style={{ background: THEME.navy, padding: "20px", textAlign: "center", borderBottom: "1px solid rgba(135,206,235,0.2)" }}>
                  <div style={{ color: THEME.sky, fontSize: 10, fontWeight: 700, letterSpacing: 3, marginBottom: 4 }}>{BRAND.name.toUpperCase()}</div>
                  <div style={{ color: "#fff", fontSize: 22, fontWeight: 900, letterSpacing: 2 }}>{viewingSeason?.name} SEASON</div>
                  <div style={{ color: THEME.sky, fontSize: 11, letterSpacing: 2, marginTop: 2 }}>{viewingSeason?.age_group ? `${viewingSeason.age_group.toUpperCase()} · ` : ""}SEASON REPORT</div>
                </div>

                <div style={{ background: "#f0f2f5", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>

                  {/* Overall record */}
                  <div style={{ background: THEME.navy, borderRadius: 14, padding: 16 }}>
                    <div style={{ color: THEME.sky, fontSize: 10, fontWeight: 700, letterSpacing: 2, marginBottom: 12, textAlign: "center" }}>SEASON RECORD</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, textAlign: "center" }}>
                      {[{ l: "PLAYED", v: sResults.length, c: "#fff" }, { l: "WON", v: wins, c: "#00c853" }, { l: "DRAWN", v: draws, c: "#ffab00" }, { l: "LOST", v: losses, c: "#d50000" }, { l: "GOALS", v: totalGoals, c: THEME.sky }].map(s => (
                        <div key={s.l}>
                          <div style={{ color: s.c, fontSize: 24, fontWeight: 900, lineHeight: 1 }}>{s.v}</div>
                          <div style={{ color: "#aaa", fontSize: 8, fontWeight: 700, letterSpacing: 1, marginTop: 3 }}>{s.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Competition breakdown */}
                  {compBreakdown.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: compBreakdown.length > 1 ? "1fr 1fr" : "1fr", gap: 8 }}>
                      {compBreakdown.map((c, i) => (
                        <div key={c.comp} style={{ background: "#fff", borderRadius: 12, padding: 12, borderLeft: `4px solid ${COMP_COLORS[i % COMP_COLORS.length]}` }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: COMP_COLORS[i % COMP_COLORS.length], letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>{c.comp}</div>
                          <div style={{ display: "flex", justifyContent: "space-between", textAlign: "center" }}>
                            {[{ l: "P", v: c.p }, { l: "W", v: c.w, col: "#00c853" }, { l: "D", v: c.d, col: "#ffab00" }, { l: "L", v: c.l, col: "#d50000" }, { l: "GF", v: c.gf, col: THEME.sky }].map(x => (
                              <div key={x.l}>
                                <div style={{ fontSize: 16, fontWeight: 900, color: x.col || THEME.navy }}>{x.v}</div>
                                <div style={{ fontSize: 8, color: "#aaa", fontWeight: 700 }}>{x.l}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Top scorers */}
                  {goalBoard.length > 0 && (
                    <div style={{ background: "#fff", borderRadius: 12, padding: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: THEME.skyInk, letterSpacing: 2, marginBottom: 10 }}>TOP GOAL SCORERS</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {goalBoard.map((g, i) => {
                          const player = players.find(p => p.name === g.name);
                          return (
                            <div key={g.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontSize: i === 0 ? 20 : 16 }}>{["🥇","🥈","🥉","4️⃣","5️⃣"][i]}</span>
                              <div style={{ width: 32, height: 32, borderRadius: "50%", background: player?.photo ? "transparent" : THEME.navy, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                                {player?.photo ? <img src={player.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <span style={{ color: THEME.sky, fontSize: 10, fontWeight: 900 }}>{g.name.slice(0,2).toUpperCase()}</span>}
                              </div>
                              <span style={{ flex: 1, fontSize: 15, fontWeight: 800, color: THEME.navy }}>{g.name}</span>
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 20, fontWeight: 900, color: THEME.navy }}>{g.count}</div>
                                <div style={{ fontSize: 8, color: "#aaa", fontWeight: 700 }}>GOALS</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Biggest win */}
                  {biggestWin && (
                    <div style={{ background: THEME.navy, borderRadius: 12, padding: 14 }}>
                      <div style={{ color: THEME.sky, fontSize: 10, fontWeight: 700, letterSpacing: 2, marginBottom: 10, textAlign: "center" }}>BIGGEST WIN OF THE SEASON</div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ textAlign: "center", flex: 1 }}>
                          <div style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>{BRAND.name.replace(/ FC$/i, "").toUpperCase()}</div>
                          <div style={{ color: THEME.sky, fontSize: 9 }}>{viewingSeason?.age_group?.toUpperCase()}</div>
                        </div>
                        <div style={{ textAlign: "center", flex: 1 }}>
                          <div style={{ color: "#fff", fontSize: 36, fontWeight: 900, lineHeight: 1 }}>{biggestWin.homeScore}–{biggestWin.awayScore}</div>
                          <div style={{ color: "#aaa", fontSize: 9, letterSpacing: 1 }}>FULL TIME</div>
                        </div>
                        <div style={{ textAlign: "center", flex: 1 }}>
                          <div style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>{biggestWin.opposition?.toUpperCase()}</div>
                          <div style={{ color: "#aaa", fontSize: 9 }}>{biggestWin.date}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {sResults.length === 0 && (
                    <div style={{ textAlign: "center", padding: 40, color: "#888", fontSize: 14 }}>No results yet for this season.</div>
                  )}

                </div>

                {/* Footer */}
                <div style={{ background: THEME.navy, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: THEME.sky, fontSize: 10, fontWeight: 700, letterSpacing: 2 }}>{BRAND.short.toUpperCase()}</span>
                  <span style={{ color: "#555", fontSize: 10, letterSpacing: 1 }}>{BRAND.slogan.toUpperCase()}</span>
                  <ClubLogo size={20} />
                </div>
              </div>

              {/* Save button */}
              <div style={{ marginTop: 12 }}>
                <SaveCardButton cardRef={reportRef} filename={`leon-${viewingSeason?.name?.replace("/","")}-season-report.png`} />
              </div>
            </div>
          );
        })()}

        {/* ── SEASON HISTORY TAB ── */}
        {mode === "seasons" && isAdmin && (
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#888", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16, textAlign: "center" }}>Season History</div>
            {seasons.map(s => {
              const sResults = results.filter(r => r.season_id === s.id);
              const wins = sResults.filter(r => r.result === "W").length;
              const drawn = sResults.filter(r => r.result === "D").length;
              const lost = sResults.filter(r => r.result === "L").length;
              const goals = sResults.reduce((a, r) => a + (r.homeScore || 0), 0);
              const comps = [...new Set(sResults.map(r => r.competition))].filter(Boolean);
              return (
                <div key={s.id} style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", borderLeft: `4px solid ${s.is_active ? THEME.sky : "#e0e0e0"}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: THEME.navy }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: THEME.skyInk, fontWeight: 700, letterSpacing: 1 }}>{s.age_group}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {s.is_active && <span style={{ background: THEME.sky, color: THEME.navy, fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 10, letterSpacing: 1 }}>CURRENT</span>}
                      <button onClick={() => { setViewingSeason(s); setMode("history"); setFilterComp("All"); setCompetitions(s.competitions || []); }} style={{ background: "#f0f4ff", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 12, color: THEME.navy }}>View →</button>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                    {[{ l: "P", v: sResults.length, c: THEME.navy }, { l: "W", v: wins, c: "#00c853" }, { l: "D", v: drawn, c: "#ffab00" }, { l: "L", v: lost, c: "#d50000" }, { l: "GF", v: goals, c: THEME.sky }].map(x => (
                      <div key={x.l} style={{ background: "#f7f8fa", borderRadius: 8, padding: "6px 10px", textAlign: "center", borderBottom: `2px solid ${x.c}` }}>
                        <div style={{ fontSize: 16, fontWeight: 900, color: x.c }}>{x.v}</div>
                        <div style={{ fontSize: 9, color: "#aaa", fontWeight: 700 }}>{x.l}</div>
                      </div>
                    ))}
                  </div>
                  {comps.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {comps.map(c => <span key={c} style={{ background: "#f0f4ff", color: THEME.skyInk, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 8 }}>{c}</span>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ── NEW SEASON MODAL ── */}
      {showSeasonModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 400 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: THEME.navy, marginBottom: 6, letterSpacing: 1 }}>🗓 START NEW SEASON</div>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 20, lineHeight: 1.5 }}>This creates a new season with fresh results. All previous data is preserved in Season History.</p>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: THEME.skyInk, letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>Season Name</label>
              <input type="text" placeholder="e.g. 2026/27" value={newSeasonForm.name} onChange={e => setNewSeasonForm(f => ({ ...f, name: e.target.value }))} style={{ width: "100%", padding: "12px 14px", border: "2px solid #e8e8e8", borderRadius: 10, fontSize: 16, fontFamily: "inherit", fontWeight: 600, color: THEME.navy, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: THEME.skyInk, letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>Age Group</label>
              <input type="text" placeholder="Age group (optional)" value={newSeasonForm.age_group} onChange={e => setNewSeasonForm(f => ({ ...f, age_group: e.target.value }))} style={{ width: "100%", padding: "12px 14px", border: "2px solid #e8e8e8", borderRadius: 10, fontSize: 16, fontFamily: "inherit", fontWeight: 600, color: THEME.navy, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setShowSeasonModal(false); setNewSeasonForm({ name: "", age_group: "" }); }} style={{ flex: 1, padding: "14px", background: "#f0f0f0", color: "#888", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={handleStartNewSeason} disabled={!newSeasonForm.name}
                style={{ flex: 2, padding: "14px", background: THEME.navy, color: THEME.sky, border: "none", borderRadius: 12, fontSize: 15, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", opacity: !newSeasonForm.name || !newSeasonForm.age_group ? 0.5 : 1 }}>
                Start New Season
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADMIN PIN GATE ── */}
      {showPinGate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(18,23,46,0.75)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => { setShowPinGate(false); setPinInput(""); setPinError(false); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: THEME.white, borderRadius: 20, padding: "28px 24px", width: "100%", maxWidth: 320, textAlign: "center" }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>🔒</div>
            <div style={{ fontFamily: THEME.display, fontWeight: 600, fontSize: 18, color: THEME.navy, marginBottom: 4 }}>Staff Room</div>
            <div style={{ fontSize: 12, color: THEME.ink60, marginBottom: 18 }}>Enter the admin PIN to manage results, squad and teams.</div>
            <input autoFocus type="password" inputMode="numeric" value={pinInput}
              onChange={e => { setPinInput(e.target.value); setPinError(false); }}
              onKeyDown={e => { if (e.key === "Enter") handleUnlockAdmin(); }}
              style={{ width: "100%", textAlign: "center", letterSpacing: 8, fontSize: 22, fontFamily: THEME.mono, padding: "12px 14px", border: `2px solid ${pinError ? THEME.loss : "#e8e8e8"}`, borderRadius: 12, outline: "none", boxSizing: "border-box", marginBottom: pinError ? 6 : 16 }} />
            {pinError && <div style={{ color: THEME.loss, fontSize: 12, fontWeight: 600, marginBottom: 12 }}>Incorrect PIN — try again</div>}
            <button onClick={handleUnlockAdmin} style={{ width: "100%", padding: "13px", background: THEME.navy, color: THEME.sky, border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", fontFamily: THEME.body }}>
              Unlock
            </button>
          </div>
        </div>
      )}

      {showInstallBanner && (
        <div style={{ position: "fixed", left: 12, right: 12, bottom: 84, background: THEME.navy, borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 6px 20px rgba(0,0,0,0.28)", zIndex: 70 }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>📲</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: THEME.white, fontFamily: THEME.display, fontWeight: 600, fontSize: 13 }}>Add {BRAND.short} to your home screen</div>
            <div style={{ color: THEME.ink30, fontSize: 11, marginTop: 1 }}>Quick access, just like an app</div>
          </div>
          <button onClick={handleDismissInstall} style={{ background: "none", border: "none", color: THEME.ink30, fontSize: 12, fontWeight: 600, padding: "6px 4px", cursor: "pointer", fontFamily: THEME.body, flexShrink: 0 }}>Not now</button>
          <button onClick={handleInstallClick} style={{ background: THEME.sky, border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 700, fontSize: 12, color: THEME.navy, cursor: "pointer", fontFamily: THEME.body, flexShrink: 0 }}>Install</button>
        </div>
      )}

      {/* ── BOTTOM TAB BAR ── */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(10px)", borderTop: "1px solid #e6e8ee", display: "flex", padding: "8px 6px calc(8px + env(safe-area-inset-bottom))", zIndex: 60 }}>
        {[
          { key: "home", label: "Home", icon: "🏠" },
          { key: "history", label: "Results", icon: "📋" },
          { key: "gallery", label: "Gallery", icon: "📷" },
          { key: "scorers", label: "Players", icon: "⭐" },
        ].map(tab => (
          <button key={tab.key} onClick={() => { setMode(tab.key); setNewResult(null); setOppLogo(null); setH2hTeam(null); }}
            style={{ flex: 1, background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontFamily: THEME.mono, fontSize: 9, letterSpacing: 0.5, textTransform: "uppercase", color: mode === tab.key ? THEME.navy : THEME.ink60, fontWeight: mode === tab.key ? 700 : 500, cursor: "pointer", padding: "4px 0" }}>
            <span style={{ fontSize: 18 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
        <button onClick={() => isAdmin ? setMode("staff") : setShowPinGate(true)}
          style={{ flex: 1, background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontFamily: THEME.mono, fontSize: 9, letterSpacing: 0.5, textTransform: "uppercase", color: (mode === "staff" || ["teams","squad","report","seasons","new","placements","branding"].includes(mode)) ? THEME.navy : THEME.ink60, fontWeight: (mode === "staff" || ["teams","squad","report","seasons","new","placements","branding"].includes(mode)) ? 700 : 500, cursor: "pointer", padding: "4px 0" }}>
          <span style={{ fontSize: 18 }}>{isAdmin ? "🔓" : "🔒"}</span>
          Admin
        </button>
      </div>

      {/* Hidden input reused by every "+ Add" photos button — target result set just before it's clicked */}
      <input ref={photoUploadRef} type="file" accept="image/*" multiple style={{ display: "none" }}
        onChange={e => { const rid = photoUploadTargetRef.current; handleAddPhotos(rid, e.target.files); e.target.value = ""; }} />

      {/* Photo lightbox */}
      {lightbox && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 200, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px" }}>
            <div>
              <div style={{ fontFamily: THEME.display, fontWeight: 600, fontSize: 14, color: "#fff" }}>{lightbox.title}</div>
              <div style={{ fontFamily: THEME.mono, fontSize: 11, color: THEME.ink30 }}>{lightbox.index + 1} / {lightbox.photos.length}</div>
            </div>
            <button onClick={() => setLightbox(null)} style={{ background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 8, color: "#fff", fontSize: 16, padding: "6px 12px", cursor: "pointer" }}>✕</button>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 12px", overflow: "hidden" }}>
            <img src={lightbox.photos[lightbox.index]?.url} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "14px 18px calc(14px + env(safe-area-inset-bottom))" }}>
            <button onClick={() => setLightbox(lb => ({ ...lb, index: (lb.index - 1 + lb.photos.length) % lb.photos.length }))}
              disabled={lightbox.photos.length < 2}
              style={{ background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 10, color: "#fff", padding: "10px 16px", fontSize: 16, cursor: lightbox.photos.length < 2 ? "default" : "pointer", opacity: lightbox.photos.length < 2 ? 0.3 : 1 }}>‹</button>
            {isAdmin && (
              <button onClick={() => handleDeletePhoto(lightbox.photos[lightbox.index])}
                style={{ background: THEME.loss, border: "none", borderRadius: 10, color: "#fff", padding: "10px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: THEME.body }}>🗑️ Delete</button>
            )}
            <button onClick={() => setLightbox(lb => ({ ...lb, index: (lb.index + 1) % lb.photos.length }))}
              disabled={lightbox.photos.length < 2}
              style={{ background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 10, color: "#fff", padding: "10px 16px", fontSize: 16, cursor: lightbox.photos.length < 2 ? "default" : "pointer", opacity: lightbox.photos.length < 2 ? 0.3 : 1 }}>›</button>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

    </div>
  );
}
