// Sunderland Leon FC — v2.3
import { useState, useRef, useEffect, useCallback } from "react";
import { fetchResults, insertResult, updateResult, deleteResult, fetchTeams, insertTeam, updateTeam, deleteTeam, fetchSeasons, insertSeason, updateSeason, setActiveSeason, fetchPlayers, insertPlayer, updatePlayer, deletePlayer, fetchAppearances, insertAppearances, deleteAppearancesByResult, uploadImage } from "./supabase.js";

// ── Logo ─────────────────────────────────────────────────
const LEON_LOGO = "data:image/png;base64,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";

function LeonLogo({ size = 68 }) {
  const [err, setErr] = useState(false);
  if (err) return <span style={{ fontSize: size * 0.6, lineHeight: 1 }}>🦢</span>;
  return <img src={LEON_LOGO} alt="Leon FC" onError={() => setErr(true)} style={{ width: size, height: size, objectFit: "contain", display: "block" }} />;
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

// ── Toast ─────────────────────────────────────────────────
function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#1a1a2e", color: "#87ceeb", padding: "12px 24px", borderRadius: 30, fontWeight: 800, fontSize: 14, letterSpacing: 1, zIndex: 999, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", whiteSpace: "nowrap", animation: "fadein 0.2s ease" }}>
      {message}
    </div>
  );
}

// ── Share helper ──────────────────────────────────────────
async function shareImage(canvas, filename) {
  canvas.toBlob(async (blob) => {
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: "image/png" })] })) {
      try {
        await navigator.share({ files: [new File([blob], filename, { type: "image/png" })], title: "Sunderland Leon FC" });
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
function getCompColor(comps, comp) { const i = comps.indexOf(comp); return COMP_COLORS[i % COMP_COLORS.length] || "#87ceeb"; }

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
function SaveCardButton({ cardRef, filename = "leon-result.png", onSaved }) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(false);
  const handleSave = async () => {
    if (!cardRef.current) return;
    setSaving(true); setErr(false);
    try {
      const h2c = await loadHtml2Canvas();
      const canvas = await h2c(cardRef.current, { backgroundColor: "#ffffff", scale: 3, useCORS: true, logging: false, allowTaint: true });
      await shareImage(canvas, filename);
      if (onSaved) onSaved();
    } catch(e) { setErr(true); }
    setSaving(false);
  };
  const canShare = typeof navigator !== "undefined" && !!navigator.share;
  return (
    <div style={{ marginTop: 12 }}>
      <button onClick={handleSave} disabled={saving}
        style={{ width: "100%", padding: "14px", background: "#1877f2", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 800, letterSpacing: 1, cursor: saving ? "wait" : "pointer", fontFamily: "inherit", textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: saving ? 0.7 : 1 }}>
        {saving ? "⏳ Saving..." : canShare ? "📤 Share Result Card" : "📸 Save as Image"}
      </button>
      {err && <p style={{ textAlign: "center", color: "#d50000", fontSize: 12, marginTop: 6 }}>Couldn't share — try a screenshot instead.</p>}
    </div>
  );
}

// ── Leaderboard ───────────────────────────────────────────
function Leaderboard({ data, label, emptyMsg, filterLabel, accentColor = "#87ceeb" }) {
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
              <div key={p.name} style={{ display: "grid", gridTemplateColumns: "36px 1fr 100px 48px", alignItems: "center", padding: "13px 18px", borderBottom: i < data.length - 1 ? "1px solid #f0f0f0" : "none", background: i === 0 ? "#fffbea" : "#fff" }}>
                <span style={{ fontSize: i < 3 ? 20 : 13, fontWeight: 800, color: i >= 3 ? "#bbb" : undefined }}>{i < 3 ? MEDAL[i] : i + 1}</span>
                <span style={{ fontSize: 17, fontWeight: 800, color: "#1a1a2e" }}>{p.name}</span>
                <div style={{ paddingRight: 10 }}>
                  <div style={{ height: 8, background: "#eee", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.round((p.count / max) * 100)}%`, background: i === 0 ? `linear-gradient(90deg,${accentColor},#1a9be8)` : i === 1 ? "linear-gradient(90deg,#b0bec5,#607d8b)" : i === 2 ? "linear-gradient(90deg,#ffcc80,#ff9800)" : "#ddd", borderRadius: 4 }} />
                  </div>
                </div>
                <span style={{ fontSize: 20, fontWeight: 900, color: "#1a1a2e", textAlign: "right" }}>{p.count}</span>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

// ── Result Card ───────────────────────────────────────────
// ── Scoreboard card (signature element) ────────────────────
function ScoreCard({ match, compColor = "#5fb2d9", onClick, showMeta = true }) {
  const isWin = match.result === "W", isLoss = match.result === "L";
  const resultBg = isWin ? "#4ade80" : isLoss ? "#f3a3ad" : "#e8a93b";
  const resultLabel = isWin ? "WIN" : isLoss ? "LOSS" : "DRAW";
  return (
    <button onClick={onClick} style={{ width: "100%", textAlign: "left", background: "#12172e", border: "none", borderRadius: 16, padding: "16px 18px", marginBottom: 12, cursor: onClick ? "pointer" : "default", position: "relative", overflow: "hidden", fontFamily: "'Work Sans',sans-serif" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${compColor}, transparent)` }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: compColor }}>{match.competition}</span>
        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: "3px 9px", borderRadius: 6, color: "#12172e", background: resultBg }}>{resultLabel}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ flex: 1, textAlign: "center" }}>
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: 700, fontSize: 30, color: "#fff", background: "#1c2344", borderRadius: 8, padding: "2px 12px", display: "inline-block", minWidth: 40 }}>{match.homeScore}</span>
          <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 11, color: "#fff", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginTop: 6 }}>Sunderland Leon</div>
        </div>
        <span style={{ color: compColor, fontFamily: "'IBM Plex Mono',monospace", fontSize: 18, margin: "0 6px" }}>–</span>
        <div style={{ flex: 1, textAlign: "center" }}>
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: 700, fontSize: 30, color: "#fff", background: "#1c2344", borderRadius: 8, padding: "2px 12px", display: "inline-block", minWidth: 40 }}>{match.awayScore}</span>
          <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 11, color: "#c6cbe0", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginTop: 6 }}>{(match.opposition || "").toUpperCase()}</div>
        </div>
      </div>
      {showMeta && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {match.motm && <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: "#e8a93b" }}>⭐ {match.motm}</span>}
          {(match.scorers || []).length > 0 && <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: "#e8a93b" }}>⚽ {match.scorers.join(", ")}</span>}
          {match.round && <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: "#8b91ad" }}>{match.round}</span>}
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#6b7191", marginLeft: "auto" }}>{match.date}</span>
        </div>
      )}
    </button>
  );
}

function ResultCard({ match, teamName = "Under 9 Blue", compColor = "#87ceeb", players = [] }) {
  const isWin = match.result === "W", isLoss = match.result === "L";
  const resultColor = isWin ? "#00c853" : isLoss ? "#d50000" : "#ffab00";
  const resultLabel = isWin ? "WIN" : isLoss ? "LOSS" : "DRAW";
  const cardRef = useRef();
  const filename = `leon-vs-${(match.opposition || "result").replace(/\s+/g,"-").toLowerCase()}.png`;
  return (
    <div>
      <div ref={cardRef} style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.10)", width: "100%", maxWidth: 520, margin: "0 auto", fontFamily: "'Barlow Condensed','Arial Narrow',Arial,sans-serif", border: "1px solid #e8e8e8" }}>
        <div style={{ background: "#1a1a2e", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", rowGap: 6, columnGap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <span style={{ color: compColor, fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>{match.competition}</span>
            {match.round && <span style={{ color: "#aaa", fontSize: 11, marginLeft: 8, fontWeight: 600 }}>· {match.round}</span>}
          </div>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{match.date}</span>
          <span style={{ background: resultColor, color: "#fff", fontWeight: 800, fontSize: 12, letterSpacing: 2, padding: "3px 10px", borderRadius: 20, flexShrink: 0 }}>{resultLabel}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 20px 16px", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1.2, gap: 8 }}>
            <div style={{ background: "#f0f4ff", borderRadius: 14, padding: 10, display: "flex", alignItems: "center", justifyContent: "center", width: 80, height: 80 }}>
              <LeonLogo size={68} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", textAlign: "center", lineHeight: 1.2 }}>
              SUNDERLAND LEON<br /><span style={{ color: compColor, fontSize: 11 }}>{teamName.toUpperCase()}</span>
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 56, fontWeight: 900, color: "#1a1a2e", lineHeight: 1 }}>{match.homeScore}</span>
              <span style={{ fontSize: 28, fontWeight: 300, color: "#aaa" }}>–</span>
              <span style={{ fontSize: 56, fontWeight: 900, color: "#1a1a2e", lineHeight: 1 }}>{match.awayScore}</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#999", textTransform: "uppercase" }}>Full Time</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1.2, gap: 8 }}>
            <div style={{ background: "#f0f4ff", borderRadius: 14, padding: 10, display: "flex", alignItems: "center", justifyContent: "center", width: 80, height: 80 }}>
              {match.oppLogo ? <img src={match.oppLogo} alt={match.opposition} style={{ width: 68, height: 68, objectFit: "contain" }} /> : <span style={{ fontSize: 30 }}>⚽</span>}
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", textAlign: "center", lineHeight: 1.2 }}>{(match.opposition || "").toUpperCase()}</span>
          </div>
        </div>
        {(match.scorers || []).length > 0 && (
          <>
            <div style={{ height: 1, background: "#eee", margin: "0 20px" }} />
            <div style={{ padding: "12px 20px 14px" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: compColor, letterSpacing: 2, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Goal Scorers</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {match.scorers.map((scorer, i) => {
                  const name = scorer.replace(/\s*[×x]\d+$/, "").trim();
                  const player = players.find(p => p.name === name);
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {player?.photo ? (
                        <div style={{ width: 44, height: 44, borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: "2px solid #87ceeb" }}>
                          <img src={player.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={name} />
                        </div>
                      ) : (
                        <span style={{ fontSize: 16 }}>⚽</span>
                      )}
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>{player?.squad_number ? `#${player.squad_number} ` : ""}{scorer}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
        {(match.motm || match.oppMotm) && (
          <>
            <div style={{ height: 1, background: "#eee", margin: "0 20px" }} />
            <div style={{ padding: "12px 20px 14px", display: "flex", gap: 20, flexWrap: "wrap" }}>
              {match.motm && (() => {
                const player = players.find(p => p.name === match.motm);
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {player?.photo ? (
                      <div style={{ width: 52, height: 52, borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: "2px solid #ffd700" }}>
                        <img src={player.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={match.motm} />
                      </div>
                    ) : (
                      <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "2px solid #ffd700" }}>
                        <span style={{ color: "#ffd700", fontSize: 13, fontWeight: 900 }}>{match.motm.slice(0,2).toUpperCase()}</span>
                      </div>
                    )}
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: compColor, letterSpacing: 2, textTransform: "uppercase", display: "block", marginBottom: 2 }}>Man of the Match</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e" }}>{match.motm}</span>
                    </div>
                  </div>
                );
              })()}
              {match.oppMotm && (() => {
                const player = players.find(p => p.name === match.oppMotm);
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {player?.photo ? (
                      <div style={{ width: 52, height: 52, borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: "2px solid #ff7eb3" }}>
                        <img src={player.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={match.oppMotm} />
                      </div>
                    ) : (
                      <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "2px solid #ff7eb3" }}>
                        <span style={{ color: "#ff7eb3", fontSize: 13, fontWeight: 900 }}>{match.oppMotm.slice(0,2).toUpperCase()}</span>
                      </div>
                    )}
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#aaa", letterSpacing: 2, textTransform: "uppercase", display: "block", marginBottom: 2 }}>Opp. Man of Match</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#555" }}>{match.oppMotm}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </>
        )}
        <div style={{ background: "#1a1a2e", padding: "8px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: compColor, fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>LEON FC</span>
          <span style={{ color: "#555", fontSize: 11, letterSpacing: 1 }}>ALWAYS KEEP ME FLYING HIGH</span>
          <LeonLogo size={24} />
        </div>
      </div>
      <SaveCardButton cardRef={cardRef} filename={filename} />
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
          <span style={{ fontSize: 16, fontWeight: 600, color: value ? "#1a1a2e" : "#aaa", fontFamily: "inherit" }}>{value || "Select opposition..."}</span>
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
                <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e", fontFamily: "inherit" }}>{t.name}</span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: 16, textAlign: "center", color: "#bbb", fontSize: 14 }}>No teams found</div>
            )}
          </div>
          <div onClick={() => { onAddNew(search); setOpen(false); }}
            style={{ padding: "12px 16px", borderTop: "2px solid #f0f0f0", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "#87ceeb", fontWeight: 800, fontSize: 14, fontFamily: "inherit" }}>
            <span>+</span> Add "{search || "new team"}" to list
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState("home");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPinGate, setShowPinGate] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (msg) => setToast(msg);
  const [scorersTab, setScorersTab] = useState("goals");
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  const [dbErrorMsg, setDbErrorMsg] = useState("");

  const [teamName, setTeamName] = useState("Under 9 Blue");
  const [editingTeamName, setEditingTeamName] = useState(false);
  const [tempTeamName, setTempTeamName] = useState("Under 9 Blue");
  const [results, setResults] = useState([]);
  const [competitions, setCompetitions] = useState(DEFAULT_COMPETITIONS);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [appearances, setAppearances] = useState([]);
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
  const [goalCounts, setGoalCounts] = useState({});
  const [motmPlayerId, setMotmPlayerId] = useState(null);
  const [oppMotmPlayerId, setOppMotmPlayerId] = useState(null);
  const playerPhotoRef = useRef();

  const [form, setForm] = useState({ date: "", opposition: "", homeScore: "", awayScore: "", scorers: "", competition: "", motm: "", oppMotm: "", round: "", season_id: null });
  const fileRef = useRef();
  const editFileRef = useRef();
  const reportRef = useRef();
  const teamLogoRef = useRef();
  const [uploadingLogoForTeam, setUploadingLogoForTeam] = useState(null);

  // ── Load data ──────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [r, t, s, pl, ap] = await Promise.all([fetchResults(), fetchTeams(), fetchSeasons(), fetchPlayers(), fetchAppearances()]);
        setResults(r);
        setTeams(t);
        setPlayers(pl);
        setAppearances(ap);
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
          const created = await insertSeason({ name: "2025/26", age_group: "Under 9 Blue", is_active: true, competitions: DEFAULT_COMPETITIONS });
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
  const homeTopScorer = buildGoalBoard(seasonResults)[0] || null;
  const homeSeasonRecord = {
    played: seasonResults.length,
    won: seasonResults.filter(r => r.result === "W").length,
    drawn: seasonResults.filter(r => r.result === "D").length,
    lost: seasonResults.filter(r => r.result === "L").length,
  };

  // ── Handlers ───────────────────────────────────────────
  const handleCreate = async () => {
    const hs = parseInt(form.homeScore), as_ = parseInt(form.awayScore);
    const result = hs > as_ ? "W" : hs < as_ ? "L" : "D";
    // Build scorers list from goalCounts
    const scorerList = Object.entries(goalCounts)
      .filter(([, count]) => count > 0)
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
    setSelectedMatch(null);
  };

  const handleSavePlayer = async () => {
    const data = { name: playerForm.name.trim(), squad_number: parseInt(playerForm.squad_number) || null, photo: playerForm.photo || null, is_active: true };
    if (!data.name) return;
    if (editingPlayer) {
      const updated = { ...editingPlayer, ...data };
      try { await updatePlayer(updated); } catch(e) {}
      setPlayers(prev => prev.map(p => p.id === updated.id ? updated : p));
    } else {
      try { const saved = await insertPlayer(data); setPlayers(prev => [...prev, saved || { ...data, id: Date.now() }].sort((a,b) => (a.squad_number||99)-(b.squad_number||99))); }
      catch(e) { setPlayers(prev => [...prev, { ...data, id: Date.now() }]); }
    }
    setShowPlayerModal(false);
    setEditingPlayer(null);
    setPlayerForm({ name: "", squad_number: "", photo: null });
    showToast("✅ Player saved!");
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

  const handleLockAdmin = () => {
    setIsAdmin(false);
    setMode("home");
  };

  const handleAddComp = async () => {
    const name = newCompName.trim().replace(/\b\w/g, c => c.toUpperCase()); // title case
    if (!name || competitions.includes(name)) { setNewCompName(""); setAddingComp(false); return; }
    const updated = [...competitions, name];
    setCompetitions(updated);
    setForm(f => ({ ...f, competition: name })); // auto-select the new competition
    // Save to the current season in Supabase
    if (viewingSeason) {
      try {
        await updateSeason({ ...viewingSeason, competitions: updated });
        setViewingSeason(s => s ? { ...s, competitions: updated } : s);
        if (isViewingActive) setActiveSeasonState(s => s ? { ...s, competitions: updated } : s);
      } catch(e) {}
    }
    setNewCompName("");
    setAddingComp(false);
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
        await updateSeason({ ...viewingSeason, competitions: updated });
        setViewingSeason(s => s ? { ...s, competitions: updated } : s);
        if (isViewingActive) setActiveSeasonState(s => s ? { ...s, competitions: updated } : s);
      } catch(e) {}
    }
    setEditingComp(null);
  };

  const isViewingActive = !viewingSeason || !activeSeason || viewingSeason?.id === activeSeason?.id;

  const handleStartNewSeason = async () => {
    if (!newSeasonForm.name || !newSeasonForm.age_group) return;
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
  const inputStyle = { width: "100%", padding: "12px 14px", border: "2px solid #e8e8e8", borderRadius: 10, fontSize: 16, fontFamily: "inherit", fontWeight: 600, color: "#1a1a2e", outline: "none", boxSizing: "border-box" };
  const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, color: "#87ceeb", letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" };
  const cardStyle = { background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", maxWidth: 520, margin: "0 auto" };

  // ── Loading / Error screens ─────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#1a1a2e", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, fontFamily: "inherit" }}>
      <LeonLogo size={80} />
      <div style={{ color: "#87ceeb", fontSize: 22, fontWeight: 800, letterSpacing: 3 }}>LOADING...</div>
    </div>
  );

  if (dbError) return (
    <div style={{ minHeight: "100vh", background: "#1a1a2e", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, fontFamily: "inherit", textAlign: "center" }}>
      <LeonLogo size={80} />
      <div style={{ color: "#d50000", fontSize: 22, fontWeight: 800, letterSpacing: 2 }}>⚠️ CONNECTION ERROR</div>
      <div style={{ color: "#aaa", fontSize: 15, maxWidth: 320, lineHeight: 1.5 }}>Could not connect to the database. Check your Supabase URL and API key in <code style={{ color: "#87ceeb" }}>src/supabase.js</code></div>
      {dbErrorMsg && <div style={{ color: "#ff7eb3", fontSize: 12, maxWidth: 320, marginTop: 8, wordBreak: "break-all", background: "rgba(255,255,255,0.05)", padding: "8px 12px", borderRadius: 8 }}>{dbErrorMsg}</div>}
      <button onClick={() => window.location.reload()} style={{ background: "#87ceeb", color: "#1a1a2e", border: "none", borderRadius: 10, padding: "12px 24px", fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>Try Again</button>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: THEME.chalk, fontFamily: THEME.body, paddingBottom: 100 }}>

      {/* Top bar */}
      <div style={{ background: THEME.navy, padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
        <div style={{ background: THEME.white, borderRadius: "50%", padding: 4, display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, flexShrink: 0, border: `2px solid ${THEME.sky}` }}>
          <LeonLogo size={34} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: THEME.white, fontFamily: THEME.display, fontWeight: 600, fontSize: 17, letterSpacing: 0.5, lineHeight: 1.1 }}>Sunderland Leon FC</div>
          {editingTeamName ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <input autoFocus value={tempTeamName} onChange={e => setTempTeamName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { setTeamName(tempTeamName); setEditingTeamName(false); } if (e.key === "Escape") setEditingTeamName(false); }}
                style={{ background: "rgba(255,255,255,0.15)", border: `1px solid ${THEME.sky}`, borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 600, letterSpacing: 1, padding: "3px 8px", fontFamily: THEME.mono, width: 150, outline: "none" }} />
              <button onClick={() => { setTeamName(tempTeamName); setEditingTeamName(false); }} style={{ background: THEME.sky, border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontWeight: 700, fontSize: 11, color: THEME.navy, fontFamily: THEME.body }}>Save</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 1 }}>
              <div style={{ color: THEME.sky, fontFamily: THEME.mono, fontWeight: 600, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase" }}>{viewingSeason?.age_group || teamName}</div>
              <button onClick={() => { setTempTeamName(teamName); setEditingTeamName(true); }} style={{ background: "rgba(95,178,217,0.18)", border: `1px solid rgba(95,178,217,0.35)`, borderRadius: 5, padding: "1px 6px", cursor: "pointer", color: THEME.sky, fontSize: 9, fontWeight: 700, fontFamily: THEME.body }}>Edit</button>
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
          <span style={{ fontSize: 12, fontWeight: 700, color: "#3a2a05", letterSpacing: 0.5 }}>📅 Viewing: {viewingSeason?.name} — {viewingSeason?.age_group}</span>
          <button onClick={() => { setViewingSeason(activeSeason); setFilterComp("All"); }} style={{ background: THEME.navy, color: THEME.amber, border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: THEME.body }}>Back to Current</button>
        </div>
      )}


      {/* Competition filter — shown on Results and Awards tabs */}
      {(mode === "history" || mode === "scorers") && (
        <div style={{ background: "#fff", borderBottom: "1px solid #f0f0f0", padding: "10px 16px", display: "flex", gap: 8, overflowX: "auto", alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#aaa", letterSpacing: 2, whiteSpace: "nowrap", textTransform: "uppercase" }}>Filter:</span>
          {["All", ...competitionsInUse].map((comp, idx) => {
            const active = filterComp === comp;
            const isAll = comp === "All";
            const color = isAll ? "#1a1a2e" : getCompColor(competitions, comp);
            const compIdx = idx - 1;
            return (
              <div key={comp} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                {editingComp === compIdx && !isAll ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input autoFocus value={tempCompName} onChange={e => setTempCompName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleRenameComp(compIdx); if (e.key === "Escape") setEditingComp(null); }}
                      style={{ border: "1.5px solid #87ceeb", borderRadius: 16, padding: "4px 10px", fontSize: 12, fontWeight: 700, fontFamily: "inherit", outline: "none", width: 120 }} />
                    <button onClick={() => handleRenameComp(compIdx)} style={{ background: "#1a1a2e", color: "#87ceeb", border: "none", borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 800 }}>✓</button>
                    <button onClick={() => setEditingComp(null)} style={{ background: "#eee", color: "#888", border: "none", borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}>✕</button>
                  </div>
                ) : (
                  <>
                    <button onClick={() => { setFilterComp(comp); setSelectedMatch(null); setFilterRound("All"); }}
                      style={{ padding: "6px 12px", borderRadius: 20, border: active ? "none" : "1.5px solid #e0e0e0", background: active ? color : "#fff", color: active ? (isAll ? "#87ceeb" : "#1a1a2e") : "#888", fontWeight: 800, fontSize: 12, letterSpacing: 1, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", textTransform: "uppercase" }}>
                      {comp}
                    </button>
                    {!isAll && <button onClick={() => { setEditingComp(compIdx); setTempCompName(comp); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#bbb", padding: "2px" }}>✏️</button>}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Round filter — only shown when a specific competition is selected and has rounds */}
      {(mode === "history") && filterComp !== "All" && roundsInUse.length > 0 && (
        <div style={{ background: "#f7f8fa", borderBottom: "1px solid #f0f0f0", padding: "8px 16px", display: "flex", gap: 8, overflowX: "auto", alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#aaa", letterSpacing: 2, whiteSpace: "nowrap", textTransform: "uppercase" }}>Round:</span>
          {["All", ...roundsInUse].map(round => {
            const active = filterRound === round;
            return (
              <button key={round} onClick={() => setFilterRound(round)}
                style={{ padding: "5px 12px", borderRadius: 20, border: active ? "none" : "1.5px solid #e0e0e0", background: active ? "#1a1a2e" : "#fff", color: active ? "#87ceeb" : "#888", fontWeight: 800, fontSize: 11, letterSpacing: 1, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", textTransform: "uppercase" }}>
                {round}
              </button>
            );
          })}
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
              <div style={{ textAlign: "center", padding: "30px 20px", color: THEME.ink30, background: THEME.white, borderRadius: 16 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>⚽</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink60 }}>No results logged yet</div>
              </div>
            )}

            {homeTopScorer && (
              <>
                <div style={{ fontFamily: THEME.mono, fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", color: THEME.ink60, margin: "24px 0 10px" }}>Top Scorer</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, background: THEME.white, borderRadius: 14, padding: "12px 16px", boxShadow: "0 2px 8px rgba(18,23,46,0.06)" }}>
                  <div style={{ fontFamily: THEME.display, fontWeight: 600, fontSize: 20, color: THEME.amber, width: 22 }}>1</div>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: THEME.navy, color: THEME.sky, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: THEME.display, fontWeight: 600, fontSize: 13 }}>{homeTopScorer.name.slice(0,2).toUpperCase()}</div>
                  <div style={{ flex: 1, fontWeight: 600, fontSize: 14, color: THEME.navy }}>{homeTopScorer.name}</div>
                  <div style={{ fontFamily: THEME.mono, fontWeight: 700, fontSize: 16, color: THEME.pitch }}>{homeTopScorer.count}</div>
                </div>
              </>
            )}
          </div>
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
            ].map(item => (
              <button key={item.key} disabled={item.disabled} onClick={() => setMode(item.key)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, background: THEME.white, border: "none", borderLeft: `3px solid ${item.accent}`, borderRadius: 14, padding: "14px 16px", marginBottom: 10, boxShadow: "0 2px 8px rgba(18,23,46,0.05)", cursor: item.disabled ? "default" : "pointer", opacity: item.disabled ? 0.5 : 1, fontFamily: THEME.body, textAlign: "left" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: THEME.navy, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: THEME.navy }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: THEME.ink60, marginTop: 1 }}>{item.disabled ? "Switch to the current season to log a result" : item.desc}</div>
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
            <div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 20, flexWrap: "wrap" }}>
                {[
                  { label: "Played", val: filteredResults.length, color: "#1a1a2e" },
                  { label: "Won", val: filteredResults.filter(r => r.result === "W").length, color: "#00c853" },
                  { label: "Drawn", val: filteredResults.filter(r => r.result === "D").length, color: "#ffab00" },
                  { label: "Lost", val: filteredResults.filter(r => r.result === "L").length, color: "#d50000" },
                  { label: "Goals", val: filteredResults.reduce((a, r) => a + (r.homeScore || 0), 0), color: "#87ceeb" },
                ].map(s => (
                  <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "10px 18px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", minWidth: 70, borderBottom: `3px solid ${s.color}` }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: 11, color: "#999", fontWeight: 700, letterSpacing: 1 }}>{s.label.toUpperCase()}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", maxWidth: 520, margin: "0 auto 12px" }}>
                <button onClick={() => setSortOrder(s => s === "desc" ? "asc" : "desc")}
                  style={{ background: "#fff", border: "1.5px solid #e0e0e0", borderRadius: 20, padding: "6px 14px", cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 12, color: "#555", letterSpacing: 1 }}>
                  {sortOrder === "desc" ? "↓ Newest First" : "↑ Oldest First"}
                </button>
              </div>
            </div>

            {filteredResults.length === 0 && <div style={{ textAlign: "center", padding: "40px 20px", color: "#bbb" }}><div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div><div style={{ fontSize: 16, fontWeight: 700, color: "#aaa", marginBottom: 6 }}>No results yet</div><div style={{ fontSize: 13 }}>Tap ➕ New to add your first result</div></div>}

            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 520, margin: "0 auto" }}>
              {filteredResults.map((m) => {
                const cc = getCompColor(competitions, m.competition);
                const isSelected = selectedMatch === m.id;
                return (
                  <div key={m.id}>
                    <ScoreCard match={m} compColor={cc} onClick={() => setSelectedMatch(isSelected ? null : m.id)} />

                    {isSelected && (
                      <div style={{ background: "#f8faff", borderRadius: 12, marginTop: -8, marginBottom: 4, boxShadow: "0 4px 8px rgba(0,0,0,0.06)", overflow: "hidden" }}>
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
                              style={{ flex: 1, padding: "12px", background: "none", border: "none", borderRight: "1px solid #e8eeff", cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 13, color: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                              ✏️ Edit
                            </button>
                            <button onClick={() => { if (window.confirm(`Delete result vs ${m.opposition}?`)) handleDeleteResult(m.id); }}
                              style={{ flex: 1, padding: "12px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 13, color: "#d50000", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                              🗑️ Delete
                            </button>
                          </div>
                        )}
                        <div style={{ padding: 16 }}>
                          <ResultCard match={m} teamName={teamName} compColor={getCompColor(competitions, m.competition)} players={players} />
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
                    <span style={{ fontSize: 18, fontWeight: 900, color: "#1a1a2e", letterSpacing: 1 }}>✏️ EDIT RESULT</span>
                    <button onClick={() => { setEditingResult(null); setEditOppLogo(null); }} style={{ background: "#f0f0f0", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 800, fontSize: 14, color: "#888", fontFamily: "inherit" }}>✕</button>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Competition</label>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {[...new Set([...competitions, editingResult.competition].filter(Boolean))].map(comp => (
                        <button key={comp} onClick={() => setEditingResult(r => ({ ...r, competition: comp }))}
                          style={{ padding: "6px 12px", borderRadius: 20, border: editingResult.competition === comp ? "none" : "1.5px solid #e0e0e0", background: editingResult.competition === comp ? "#1a1a2e" : "#fff", color: editingResult.competition === comp ? "#87ceeb" : "#888", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase" }}>
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
                    { label: "Leon Score", key: "homeScore", type: "number" },
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
                            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, background: count > 0 ? "#f0f4ff" : "#f7f8fa", borderRadius: 10, padding: "8px 12px", border: count > 0 ? "1.5px solid #87ceeb" : "1.5px solid #e8e8e8" }}>
                              <div style={{ width: 28, height: 28, borderRadius: "50%", background: p.photo ? "transparent" : "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                                {p.photo ? <img src={p.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <span style={{ color: "#87ceeb", fontSize: 9, fontWeight: 900 }}>{p.name.slice(0,2).toUpperCase()}</span>}
                              </div>
                              <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>{p.name}</span>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <button onClick={() => setEditGoalCounts(prev => ({ ...prev, [p.id]: Math.max(0, (prev[p.id] || 0) - 1) }))}
                                  style={{ width: 28, height: 28, borderRadius: "50%", border: "1.5px solid #e0e0e0", background: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontFamily: "inherit" }}>−</button>
                                <span style={{ fontSize: 18, fontWeight: 900, color: "#1a1a2e", minWidth: 18, textAlign: "center" }}>{count}</span>
                                <button onClick={() => setEditGoalCounts(prev => ({ ...prev, [p.id]: (prev[p.id] || 0) + 1 }))}
                                  style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: "#1a1a2e", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#87ceeb", fontFamily: "inherit" }}>+</button>
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
                    <label style={labelStyle}>Round (optional)</label>
                    <input type="text" placeholder="e.g. Group Stage, Semi Final, Final" value={editingResult.round || ""} onChange={e => setEditingResult(r => ({ ...r, round: e.target.value }))} style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Season</label>
                    <select value={editingResult.season_id || ""} onChange={e => setEditingResult(r => ({ ...r, season_id: parseInt(e.target.value) }))}
                      style={{ ...inputStyle, colorScheme: "light" }}>
                      {seasons.map(s => <option key={s.id} value={s.id}>{s.name} — {s.age_group}{s.is_active ? " (Current)" : ""}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>⭐ Man of Match</label>
                    <input type="text" value={editingResult.motm || ""} onChange={e => setEditingResult(r => ({ ...r, motm: e.target.value }))} style={inputStyle} placeholder="Type or select below" />
                    {players.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                        {players.map(p => (
                          <button key={p.id} onClick={() => setEditingResult(r => ({ ...r, motm: r.motm === p.name ? "" : p.name }))}
                            style={{ padding: "4px 10px", borderRadius: 16, border: editingResult.motm === p.name ? "none" : "1.5px solid #e0e0e0", background: editingResult.motm === p.name ? "#ffd700" : "#fff", color: editingResult.motm === p.name ? "#1a1a2e" : "#888", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
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
                  <button onClick={handleSaveEdit} style={{ width: "100%", padding: "15px", background: "#1a1a2e", color: "#87ceeb", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}>Save Changes</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── AWARDS TAB ── */}
        {mode === "scorers" && (
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            <div style={{ display: "flex", background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", marginBottom: 20 }}>
              {[{ key: "goals", label: "⚽ Goals" }, { key: "motm", label: "⭐ MOTM" }, { key: "oppmotm", label: "🏅 Opp MOTM" }].map(st => (
                <button key={st.key} onClick={() => setScorersTab(st.key)}
                  style={{ flex: 1, padding: "12px 6px", border: "none", background: scorersTab === st.key ? "#1a1a2e" : "none", color: scorersTab === st.key ? "#87ceeb" : "#999", fontWeight: 800, fontSize: 12, letterSpacing: 1, cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase" }}>
                  {st.label}
                </button>
              ))}
            </div>
            <div style={{ background: "#1a1a2e", borderRadius: 14, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>
              {[
                { label: "Total Goals", val: filteredResults.reduce((a, r) => a + (r.homeScore || 0), 0) },
                { label: "Scorers", val: buildGoalBoard(filteredResults).length },
                { label: "Win Rate", val: `${filteredResults.filter(r => r.result === "W").length}/${filteredResults.length}` },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ color: "#87ceeb", fontSize: 28, fontWeight: 900 }}>{s.val}</div>
                  <div style={{ color: "#aaa", fontSize: 10, fontWeight: 700, letterSpacing: 2 }}>{s.label.toUpperCase()}</div>
                </div>
              ))}
            </div>
            {scorersTab === "goals" && <Leaderboard data={buildGoalBoard(filteredResults)} label="Top Goal Scorers" emptyMsg="No goals recorded yet." filterLabel={filterComp === "All" ? "All Competitions" : filterComp} accentColor="#87ceeb" />}
            {scorersTab === "motm" && <Leaderboard data={buildAwardBoard(filteredResults, "motm")} label="Man of the Match" emptyMsg="No MOTM awards yet." filterLabel={filterComp === "All" ? "All Competitions" : filterComp} accentColor="#ffd700" />}
            {scorersTab === "oppmotm" && <Leaderboard data={buildAwardBoard(filteredResults, "oppMotm")} label="Opposition MOTM" emptyMsg="No Opp. MOTM awards yet." filterLabel={filterComp === "All" ? "All Competitions" : filterComp} accentColor="#ff7eb3" />}
            <p style={{ textAlign: "center", color: "#bbb", fontSize: 12, marginTop: 14, letterSpacing: 1 }}>SUNDERLAND LEON {teamName.toUpperCase()}</p>
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
                          { label: "Played", val: h2hResults.length, color: "#1a1a2e" },
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
                            <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: "#1a1a2e" }}>{m.homeScore}–{m.awayScore}</span>
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
                        style={{ width: 44, height: 44, borderRadius: 10, background: "#f0f4ff", border: "1.5px dashed #87ceeb", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", padding: 0 }}>
                        {t.logo
                          ? <img src={t.logo} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt={t.name} />
                          : <span style={{ fontSize: 20 }}>⚽</span>}
                      </button>
                      {editingTeam?.id === t.id ? (
                        <div style={{ display: "flex", gap: 6, flex: 1, alignItems: "center" }}>
                          <input autoFocus value={editingTeamNameVal} onChange={e => setEditingTeamNameVal(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") { handleRenameTeam(t.id, editingTeamNameVal); setEditingTeam(null); } if (e.key === "Escape") setEditingTeam(null); }}
                            style={{ flex: 1, border: "2px solid #87ceeb", borderRadius: 8, padding: "7px 10px", fontSize: 15, fontFamily: "inherit", fontWeight: 700, color: "#1a1a2e", outline: "none" }} />
                          <button onClick={() => { handleRenameTeam(t.id, editingTeamNameVal); setEditingTeam(null); }}
                            style={{ background: "#1a1a2e", color: "#87ceeb", border: "none", borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 13 }}>✓</button>
                          <button onClick={() => setEditingTeam(null)}
                            style={{ background: "#f0f0f0", color: "#888", border: "none", borderRadius: 8, padding: "7px 10px", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>✕</button>
                        </div>
                      ) : (
                        <>
                          <span style={{ flex: 1, fontSize: 16, fontWeight: 800, color: "#1a1a2e" }}>{t.name}</span>
                          <button onClick={() => { setH2hTeam(t.name); setTeamSearch(t.name); }}
                            style={{ background: "#f0f4ff", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 12, color: "#87ceeb" }}>H2H</button>
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
                  style={{ width: "100%", padding: "13px", background: "#1a1a2e", color: "#87ceeb", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 800, letterSpacing: 1, cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase" }}>
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
                <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2e", marginBottom: 20, letterSpacing: 1 }}>🏆 POST A RESULT</div>

                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Competition</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                    {competitions.map(comp => (
                      <button key={comp} onClick={() => setForm(f => ({ ...f, competition: comp }))}
                        style={{ padding: "7px 14px", borderRadius: 20, border: form.competition === comp ? "none" : "1.5px solid #e0e0e0", background: form.competition === comp ? "#1a1a2e" : "#fff", color: form.competition === comp ? "#87ceeb" : "#888", fontWeight: 800, fontSize: 12, letterSpacing: 1, cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase" }}>
                        {comp}
                      </button>
                    ))}
                    {!addingComp && (
                      <button onClick={() => setAddingComp(true)} style={{ padding: "7px 14px", borderRadius: 20, border: "1.5px dashed #87ceeb", background: "#fff", color: "#87ceeb", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>+ New</button>
                    )}
                  </div>
                  {addingComp && (
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <input autoFocus placeholder="Competition name..." value={newCompName} onChange={e => setNewCompName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleAddComp(); if (e.key === "Escape") setAddingComp(false); }} style={{ ...inputStyle, flex: 1, padding: "10px 14px" }} />
                      <button onClick={handleAddComp} style={{ background: "#1a1a2e", color: "#87ceeb", border: "none", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontWeight: 800, fontFamily: "inherit", fontSize: 13 }}>Add</button>
                      <button onClick={() => setAddingComp(false)} style={{ background: "#f0f0f0", color: "#888", border: "none", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>✕</button>
                    </div>
                  )}
                </div>

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
                    <label style={labelStyle}>Leon Score</label>
                    <input type="number" placeholder="" value={form.homeScore} onChange={e => setForm(f => ({ ...f, homeScore: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Opp Score</label>
                    <input type="number" placeholder="" value={form.awayScore} onChange={e => setForm(f => ({ ...f, awayScore: e.target.value }))} style={inputStyle} />
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Round (optional)</label>
                  <input type="text" placeholder="e.g. Group Stage, Semi Final, Final" value={form.round} onChange={e => setForm(f => ({ ...f, round: e.target.value }))} style={inputStyle} />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Season</label>
                  <select value={form.season_id || activeSeason?.id || ""} onChange={e => setForm(f => ({ ...f, season_id: parseInt(e.target.value) }))}
                    style={{ ...inputStyle, colorScheme: "light" }}>
                    {seasons.map(s => <option key={s.id} value={s.id}>{s.name} — {s.age_group}{s.is_active ? " (Current)" : ""}</option>)}
                  </select>
                </div>

                {players.length > 0 ? (
                  <>
                    {/* Who played */}
                    <div style={{ marginBottom: 16 }}>
                      <label style={labelStyle}>Who Played Today?</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {players.map(p => {
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
                              style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20, border: selected ? "none" : "1.5px solid #e0e0e0", background: selected ? "#1a1a2e" : "#fff", color: selected ? "#87ceeb" : "#888", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                              <span style={{ fontWeight: 900, fontSize: 11, color: selected ? "#87ceeb" : "#aaa" }}>#{p.squad_number || "?"}</span>
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
                              <div key={pid} style={{ display: "flex", alignItems: "center", gap: 12, background: count > 0 ? "#f0f4ff" : "#f7f8fa", borderRadius: 10, padding: "10px 14px", border: count > 0 ? "1.5px solid #87ceeb" : "1.5px solid #e8e8e8" }}>
                                <div style={{ width: 32, height: 32, borderRadius: "50%", background: p.photo ? "transparent" : "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                                  {p.photo ? <img src={p.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <span style={{ color: "#87ceeb", fontSize: 10, fontWeight: 900 }}>{p.name.slice(0,2).toUpperCase()}</span>}
                                </div>
                                <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: "#1a1a2e" }}>{p.name}</span>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <button onClick={() => setGoalCounts(prev => ({ ...prev, [pid]: Math.max(0, (prev[pid] || 0) - 1) }))}
                                    style={{ width: 32, height: 32, borderRadius: "50%", border: "1.5px solid #e0e0e0", background: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontFamily: "inherit" }}>−</button>
                                  <span style={{ fontSize: 20, fontWeight: 900, color: "#1a1a2e", minWidth: 20, textAlign: "center" }}>{count}</span>
                                  <button onClick={() => setGoalCounts(prev => ({ ...prev, [pid]: (prev[pid] || 0) + 1 }))}
                                    style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: "#1a1a2e", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#87ceeb", fontFamily: "inherit" }}>+</button>
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
                                style={{ padding: "6px 14px", borderRadius: 20, border: selected ? "none" : "1.5px solid #e0e0e0", background: selected ? "#ffd700" : "#fff", color: selected ? "#1a1a2e" : "#888", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
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

                <button onClick={handleCreate} disabled={!form.date || !form.opposition || form.homeScore === "" || form.awayScore === ""}
                  style={{ width: "100%", padding: "16px", background: "#1a1a2e", color: "#87ceeb", border: "none", borderRadius: 12, fontSize: 17, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", opacity: (!form.date || !form.opposition || form.homeScore === "" || form.awayScore === "") ? 0.5 : 1 }}>
                  Generate Result Card
                </button>
              </div>
            ) : (
              <div>
                <ResultCard match={newResult} teamName={teamName} compColor={getCompColor(competitions, newResult.competition)} players={players} />
                <button onClick={() => { setNewResult(null); setOppLogo(null); setSelectedSquad([]); setGoalCounts({}); setMotmPlayerId(null); setOppMotmPlayerId(null); setForm({ date: "", opposition: "", homeScore: "", awayScore: "", scorers: "", competition: form.competition, motm: "", oppMotm: "", round: "", season_id: activeSeason?.id || null }); }}
                  style={{ marginTop: 16, width: "100%", padding: "14px", background: "#fff", color: "#1a1a2e", border: "2px solid #e8e8e8", borderRadius: 12, fontSize: 15, fontWeight: 800, letterSpacing: 2, cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase" }}>
                  ← Add Another Result
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── SQUAD TAB ── */}
        {mode === "squad" && isAdmin && (
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#888", letterSpacing: 2, textTransform: "uppercase" }}>
                Squad — {viewingSeason?.age_group}
              </span>
              <button onClick={() => { setShowPlayerModal(true); setEditingPlayer(null); setPlayerForm({ name: "", squad_number: "", photo: null }); }}
                style={{ background: "#1a1a2e", color: "#87ceeb", border: "none", borderRadius: 10, padding: "8px 16px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                + Add Player
              </button>
            </div>

            {players.length === 0 && <p style={{ textAlign: "center", color: "#bbb", fontSize: 14, marginTop: 40 }}>No players added yet. Tap + Add Player to get started.</p>}

            {(() => {
              const appCounts = appearanceCountBySeason(viewingSeason?.id);
              const goalBoard = buildGoalBoard(seasonResults);
              const motmBoard = buildAwardBoard(seasonResults, "motm");
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {players.map(p => {
                    const apps = appCounts[p.id] || 0;
                    const goals = goalBoard.find(g => g.name === p.name)?.count || 0;
                    const motms = motmBoard.find(m => m.name === p.name)?.count || 0;
                    return (
                      <div key={p.id} style={{ background: "#fff", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                        {/* Photo or initials */}
                        <div style={{ width: 44, height: 44, borderRadius: "50%", background: p.photo ? "transparent" : "#1a1a2e", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                          {p.photo
                            ? <img src={p.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={p.name} />
                            : <span style={{ color: "#87ceeb", fontSize: 14, fontWeight: 900 }}>{p.name.slice(0,2).toUpperCase()}</span>
                          }
                        </div>
                        {/* Squad number */}
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: "#f0f4ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 900, color: "#1a1a2e" }}>{p.squad_number || "—"}</span>
                        </div>
                        {/* Name */}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: "#1a1a2e" }}>{p.name}</div>
                          <div style={{ display: "flex", gap: 10, marginTop: 3 }}>
                            <span style={{ fontSize: 11, color: "#888" }}>📅 {apps} apps</span>
                            {goals > 0 && <span style={{ fontSize: 11, color: "#87ceeb" }}>⚽ {goals} goals</span>}
                            {motms > 0 && <span style={{ fontSize: 11, color: "#ffd700" }}>⭐ {motms} MOTM</span>}
                          </div>
                        </div>
                        <button onClick={() => { setEditingPlayer(p); setPlayerForm({ name: p.name, squad_number: p.squad_number || "", photo: p.photo || null }); setShowPlayerModal(true); }}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#aaa" }}>✏️</button>
                        <button onClick={() => { if (window.confirm(`Remove ${p.name} from squad?`)) handleDeletePlayer(p.id); }}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#ddd" }}>🗑️</button>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Player modal */}
            {showPlayerModal && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 400 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                    <span style={{ fontSize: 18, fontWeight: 900, color: "#1a1a2e" }}>{editingPlayer ? "✏️ EDIT PLAYER" : "➕ ADD PLAYER"}</span>
                    <button onClick={() => { setShowPlayerModal(false); setEditingPlayer(null); }} style={{ background: "#f0f0f0", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 800, fontSize: 14, color: "#888", fontFamily: "inherit" }}>✕</button>
                  </div>

                  {/* Photo */}
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                    <div style={{ width: 64, height: 64, borderRadius: "50%", background: playerForm.photo ? "transparent" : "#f0f4ff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, border: "2px dashed #87ceeb" }}>
                      {playerForm.photo
                        ? <img src={playerForm.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                        : <span style={{ fontSize: 24 }}>📷</span>
                      }
                    </div>
                    <div>
                      <input ref={playerPhotoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                        const file = e.target.files[0]; if (!file) return;
                        const reader = new FileReader();
                        reader.onload = ev => setPlayerForm(f => ({ ...f, photo: ev.target.result }));
                        reader.readAsDataURL(file);
                      }} />
                      <button onClick={() => playerPhotoRef.current.click()} style={{ background: "#f0f4ff", border: "1.5px solid #87ceeb", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 12, color: "#87ceeb", display: "block", marginBottom: 6 }}>
                        {playerForm.photo ? "Change photo" : "Add photo (optional)"}
                      </button>
                      {playerForm.photo && <button onClick={() => setPlayerForm(f => ({ ...f, photo: null }))} style={{ background: "none", border: "none", color: "#d50000", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>✕ Remove</button>}
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#87ceeb", letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>Player Name</label>
                    <input type="text" placeholder="e.g. Grayson" value={playerForm.name} onChange={e => setPlayerForm(f => ({ ...f, name: e.target.value }))}
                      style={{ width: "100%", padding: "12px 14px", border: "2px solid #e8e8e8", borderRadius: 10, fontSize: 16, fontFamily: "inherit", fontWeight: 600, color: "#1a1a2e", outline: "none", boxSizing: "border-box" }} />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#87ceeb", letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>Squad Number</label>
                    <input type="number" placeholder="e.g. 7" value={playerForm.squad_number} onChange={e => setPlayerForm(f => ({ ...f, squad_number: e.target.value }))}
                      style={{ width: "100%", padding: "12px 14px", border: "2px solid #e8e8e8", borderRadius: 10, fontSize: 16, fontFamily: "inherit", fontWeight: 600, color: "#1a1a2e", outline: "none", boxSizing: "border-box" }} />
                  </div>

                  <button onClick={handleSavePlayer} disabled={!playerForm.name.trim()}
                    style={{ width: "100%", padding: "15px", background: "#1a1a2e", color: "#87ceeb", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", opacity: !playerForm.name.trim() ? 0.5 : 1 }}>
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
          const motmBoard = buildAwardBoard(sResults, "motm");
          const playerOfSeason = motmBoard[0];
          const biggestWin = sResults.filter(r => r.result === "W").sort((a, b) => (b.homeScore - b.awayScore) - (a.homeScore - a.awayScore))[0];
          const compBreakdown = [...new Set(sResults.map(r => r.competition).filter(Boolean))].map(comp => {
            const cr = sResults.filter(r => r.competition === comp);
            return { comp, p: cr.length, w: cr.filter(r => r.result === "W").length, d: cr.filter(r => r.result === "D").length, l: cr.filter(r => r.result === "L").length, gf: cr.reduce((a, r) => a + (r.homeScore || 0), 0) };
          });
          const appCounts = appearanceCountBySeason(viewingSeason?.id);

          return (
            <div style={{ maxWidth: 520, margin: "0 auto" }}>
              <div ref={reportRef} style={{ background: "#1a1a2e", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.15)" }}>

                {/* Header */}
                <div style={{ background: "#1a1a2e", padding: "20px", textAlign: "center", borderBottom: "1px solid rgba(135,206,235,0.2)" }}>
                  <div style={{ color: "#87ceeb", fontSize: 10, fontWeight: 700, letterSpacing: 3, marginBottom: 4 }}>SUNDERLAND LEON FC</div>
                  <div style={{ color: "#fff", fontSize: 22, fontWeight: 900, letterSpacing: 2 }}>{viewingSeason?.name} SEASON</div>
                  <div style={{ color: "#87ceeb", fontSize: 11, letterSpacing: 2, marginTop: 2 }}>{viewingSeason?.age_group?.toUpperCase()} · END OF SEASON REPORT</div>
                </div>

                <div style={{ background: "#f0f2f5", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>

                  {/* Overall record */}
                  <div style={{ background: "#1a1a2e", borderRadius: 14, padding: 16 }}>
                    <div style={{ color: "#87ceeb", fontSize: 10, fontWeight: 700, letterSpacing: 2, marginBottom: 12, textAlign: "center" }}>SEASON RECORD</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, textAlign: "center" }}>
                      {[{ l: "PLAYED", v: sResults.length, c: "#fff" }, { l: "WON", v: wins, c: "#00c853" }, { l: "DRAWN", v: draws, c: "#ffab00" }, { l: "LOST", v: losses, c: "#d50000" }, { l: "GOALS", v: totalGoals, c: "#87ceeb" }].map(s => (
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
                            {[{ l: "P", v: c.p }, { l: "W", v: c.w, col: "#00c853" }, { l: "D", v: c.d, col: "#ffab00" }, { l: "L", v: c.l, col: "#d50000" }, { l: "GF", v: c.gf, col: "#87ceeb" }].map(x => (
                              <div key={x.l}>
                                <div style={{ fontSize: 16, fontWeight: 900, color: x.col || "#1a1a2e" }}>{x.v}</div>
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
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#87ceeb", letterSpacing: 2, marginBottom: 10 }}>TOP GOAL SCORERS</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {goalBoard.map((g, i) => {
                          const player = players.find(p => p.name === g.name);
                          return (
                            <div key={g.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontSize: i === 0 ? 20 : 16 }}>{["🥇","🥈","🥉","4️⃣","5️⃣"][i]}</span>
                              <div style={{ width: 32, height: 32, borderRadius: "50%", background: player?.photo ? "transparent" : "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                                {player?.photo ? <img src={player.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <span style={{ color: "#87ceeb", fontSize: 10, fontWeight: 900 }}>{g.name.slice(0,2).toUpperCase()}</span>}
                              </div>
                              <span style={{ flex: 1, fontSize: 15, fontWeight: 800, color: "#1a1a2e" }}>{g.name}</span>
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 20, fontWeight: 900, color: "#1a1a2e" }}>{g.count}</div>
                                <div style={{ fontSize: 8, color: "#aaa", fontWeight: 700 }}>GOALS</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Player of the season */}
                  {playerOfSeason && (
                    <div style={{ background: "#fff", borderRadius: 12, padding: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#87ceeb", letterSpacing: 2, marginBottom: 10 }}>SEASON AWARD</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: "#fffbea", borderRadius: 10, border: "1.5px solid #ffd700" }}>
                        <span style={{ fontSize: 28 }}>⭐</span>
                        {(() => {
                          const player = players.find(p => p.name === playerOfSeason.name);
                          return (
                            <div style={{ width: 44, height: 44, borderRadius: "50%", background: player?.photo ? "transparent" : "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                              {player?.photo ? <img src={player.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <span style={{ color: "#87ceeb", fontSize: 13, fontWeight: 900 }}>{playerOfSeason.name.slice(0,2).toUpperCase()}</span>}
                            </div>
                          );
                        })()}
                        <div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: "#b8960a", letterSpacing: 1 }}>PLAYER OF THE SEASON</div>
                          <div style={{ fontSize: 18, fontWeight: 900, color: "#1a1a2e" }}>{playerOfSeason.name}</div>
                          <div style={{ fontSize: 11, color: "#888" }}>Man of the Match · {playerOfSeason.count} times</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Biggest win */}
                  {biggestWin && (
                    <div style={{ background: "#1a1a2e", borderRadius: 12, padding: 14 }}>
                      <div style={{ color: "#87ceeb", fontSize: 10, fontWeight: 700, letterSpacing: 2, marginBottom: 10, textAlign: "center" }}>BIGGEST WIN OF THE SEASON</div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ textAlign: "center", flex: 1 }}>
                          <div style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>SUNDERLAND LEON</div>
                          <div style={{ color: "#87ceeb", fontSize: 9 }}>{viewingSeason?.age_group?.toUpperCase()}</div>
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
                <div style={{ background: "#1a1a2e", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: "#87ceeb", fontSize: 10, fontWeight: 700, letterSpacing: 2 }}>LEON FC</span>
                  <span style={{ color: "#555", fontSize: 10, letterSpacing: 1 }}>ALWAYS KEEP ME FLYING HIGH</span>
                  <LeonLogo size={20} />
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
                <div key={s.id} style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", borderLeft: `4px solid ${s.is_active ? "#87ceeb" : "#e0e0e0"}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "#1a1a2e" }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: "#87ceeb", fontWeight: 700, letterSpacing: 1 }}>{s.age_group}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {s.is_active && <span style={{ background: "#87ceeb", color: "#1a1a2e", fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 10, letterSpacing: 1 }}>CURRENT</span>}
                      <button onClick={() => { setViewingSeason(s); setMode("history"); setFilterComp("All"); setCompetitions(s.competitions || []); }} style={{ background: "#f0f4ff", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 12, color: "#1a1a2e" }}>View →</button>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                    {[{ l: "P", v: sResults.length, c: "#1a1a2e" }, { l: "W", v: wins, c: "#00c853" }, { l: "D", v: drawn, c: "#ffab00" }, { l: "L", v: lost, c: "#d50000" }, { l: "GF", v: goals, c: "#87ceeb" }].map(x => (
                      <div key={x.l} style={{ background: "#f7f8fa", borderRadius: 8, padding: "6px 10px", textAlign: "center", borderBottom: `2px solid ${x.c}` }}>
                        <div style={{ fontSize: 16, fontWeight: 900, color: x.c }}>{x.v}</div>
                        <div style={{ fontSize: 9, color: "#aaa", fontWeight: 700 }}>{x.l}</div>
                      </div>
                    ))}
                  </div>
                  {comps.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {comps.map(c => <span key={c} style={{ background: "#f0f4ff", color: "#87ceeb", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 8 }}>{c}</span>)}
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
            <div style={{ fontSize: 18, fontWeight: 900, color: "#1a1a2e", marginBottom: 6, letterSpacing: 1 }}>🗓 START NEW SEASON</div>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 20, lineHeight: 1.5 }}>This creates a new season with fresh results. All previous data is preserved in Season History.</p>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#87ceeb", letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>Season Name</label>
              <input type="text" placeholder="e.g. 2026/27" value={newSeasonForm.name} onChange={e => setNewSeasonForm(f => ({ ...f, name: e.target.value }))} style={{ width: "100%", padding: "12px 14px", border: "2px solid #e8e8e8", borderRadius: 10, fontSize: 16, fontFamily: "inherit", fontWeight: 600, color: "#1a1a2e", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#87ceeb", letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>Age Group</label>
              <input type="text" placeholder="e.g. Under 10 Blue" value={newSeasonForm.age_group} onChange={e => setNewSeasonForm(f => ({ ...f, age_group: e.target.value }))} style={{ width: "100%", padding: "12px 14px", border: "2px solid #e8e8e8", borderRadius: 10, fontSize: 16, fontFamily: "inherit", fontWeight: 600, color: "#1a1a2e", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setShowSeasonModal(false); setNewSeasonForm({ name: "", age_group: "" }); }} style={{ flex: 1, padding: "14px", background: "#f0f0f0", color: "#888", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={handleStartNewSeason} disabled={!newSeasonForm.name || !newSeasonForm.age_group}
                style={{ flex: 2, padding: "14px", background: "#1a1a2e", color: "#87ceeb", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", opacity: !newSeasonForm.name || !newSeasonForm.age_group ? 0.5 : 1 }}>
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

      {/* ── BOTTOM TAB BAR ── */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(10px)", borderTop: "1px solid #e6e8ee", display: "flex", padding: "8px 6px calc(8px + env(safe-area-inset-bottom))", zIndex: 60 }}>
        {[
          { key: "home", label: "Home", icon: "🏠" },
          { key: "history", label: "Results", icon: "📋" },
          { key: "scorers", label: "Awards", icon: "⭐" },
        ].map(tab => (
          <button key={tab.key} onClick={() => { setMode(tab.key); setNewResult(null); setOppLogo(null); setH2hTeam(null); }}
            style={{ flex: 1, background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontFamily: THEME.mono, fontSize: 9, letterSpacing: 0.5, textTransform: "uppercase", color: mode === tab.key ? THEME.navy : THEME.ink60, fontWeight: mode === tab.key ? 700 : 500, cursor: "pointer", padding: "4px 0" }}>
            <span style={{ fontSize: 18 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
        <button onClick={() => isAdmin ? setMode("staff") : setShowPinGate(true)}
          style={{ flex: 1, background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontFamily: THEME.mono, fontSize: 9, letterSpacing: 0.5, textTransform: "uppercase", color: (mode === "staff" || ["teams","squad","report","seasons","new"].includes(mode)) ? THEME.navy : THEME.ink60, fontWeight: (mode === "staff" || ["teams","squad","report","seasons","new"].includes(mode)) ? 700 : 500, cursor: "pointer", padding: "4px 0" }}>
          <span style={{ fontSize: 18 }}>{isAdmin ? "🔓" : "🔒"}</span>
          Admin
        </button>
      </div>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

    </div>
  );
}
