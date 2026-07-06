import { useState, useRef, useEffect } from "react";
import { fetchResults, insertResult, updateResult, deleteResult, fetchTeams, insertTeam, deleteTeam, fetchFixtures, insertFixture, updateFixture, deleteFixture, fetchSeasons, insertSeason, updateSeason, setActiveSeason } from "./supabase.js";

// ── Logo ─────────────────────────────────────────────────
const LEON_LOGO = "data:image/png;base64,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";

function LeonLogo({ size = 68 }) {
  const [err, setErr] = useState(false);
  if (err) return <span style={{ fontSize: size * 0.6, lineHeight: 1 }}>🦢</span>;
  return <img src={LEON_LOGO} alt="Leon FC" onError={() => setErr(true)} style={{ width: size, height: size, objectFit: "contain", display: "block" }} />;
}

// ── Constants ─────────────────────────────────────────────
const DEFAULT_COMPETITIONS = ["Spring Cup"];
const INITIAL_RESULTS = [
  { id: 1, date: "11 Apr 2026", opposition: "Hebburn Town Gold Madrid", homeScore: 3, awayScore: 0, scorers: ["Grayson ×2", "Clayton"], result: "W", competition: "Spring Cup", motm: "Grayson", oppMotm: "", oppLogo: null },
  { id: 2, date: "18 Apr 2026", opposition: "Hetton Juniors Sampdoria", homeScore: 2, awayScore: 0, scorers: ["Clayton ×2"], result: "W", competition: "Spring Cup", motm: "Clayton", oppMotm: "", oppLogo: null },
  { id: 3, date: "2 May 2026", opposition: "Sunderland Girls", homeScore: 0, awayScore: 3, scorers: [], result: "L", competition: "Spring Cup", motm: "", oppMotm: "", oppLogo: null },
  { id: 4, date: "9 May 2026", opposition: "Whitburn & Cleadon Madrid", homeScore: 2, awayScore: 0, scorers: ["Grayson", "Reggie"], result: "W", competition: "Spring Cup", motm: "Reggie", oppMotm: "", oppLogo: null },
  { id: 5, date: "30 May 2026", opposition: "Chester Le Street Waldridge", homeScore: 6, awayScore: 2, scorers: ["Lewiee", "Reggie", "Grayson", "Kayson ×3"], result: "W", competition: "Spring Cup", motm: "Kayson", oppMotm: "", oppLogo: null },
  { id: 6, date: "4 Jun 2026", opposition: "Washington Tigons", homeScore: 3, awayScore: 2, scorers: ["Grayson ×2", "Kayson"], result: "W", competition: "Spring Cup", motm: "Grayson", oppMotm: "", oppLogo: null },
  { id: 7, date: "6 Jun 2026", opposition: "Deerness Valley", homeScore: 9, awayScore: 3, scorers: ["Henry", "Reggie ×2", "Grayson ×5", "Archie"], result: "W", competition: "Spring Cup", motm: "Grayson", oppMotm: "", oppLogo: null },
];
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
function formatDate(isoDate) {
  try { return new Date(isoDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
  catch(e) { return isoDate; }
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
function SaveCardButton({ cardRef, filename = "leon-result.png" }) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(false);
  const handleSave = async () => {
    if (!cardRef.current) return;
    setSaving(true); setErr(false);
    try {
      const h2c = await loadHtml2Canvas();
      const canvas = await h2c(cardRef.current, { backgroundColor: "#ffffff", scale: 3, useCORS: true, logging: false, allowTaint: true });
      const link = document.createElement("a");
      link.download = filename;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch(e) { setErr(true); }
    setSaving(false);
  };
  return (
    <div style={{ marginTop: 12 }}>
      <button onClick={handleSave} disabled={saving}
        style={{ width: "100%", padding: "14px", background: "#1877f2", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 800, letterSpacing: 1, cursor: saving ? "wait" : "pointer", fontFamily: "inherit", textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: saving ? 0.7 : 1 }}>
        {saving ? "⏳ Saving..." : "📸 Save as Image for Facebook"}
      </button>
      {err && <p style={{ textAlign: "center", color: "#d50000", fontSize: 12, marginTop: 6 }}>Couldn't save — try a screenshot instead.</p>}
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
function ResultCard({ match, teamName = "Under 9 Blue", compColor = "#87ceeb" }) {
  const isWin = match.result === "W", isLoss = match.result === "L";
  const resultColor = isWin ? "#00c853" : isLoss ? "#d50000" : "#ffab00";
  const resultLabel = isWin ? "WIN" : isLoss ? "LOSS" : "DRAW";
  const cardRef = useRef();
  const filename = `leon-vs-${(match.opposition || "result").replace(/\s+/g,"-").toLowerCase()}.png`;
  return (
    <div>
      <div ref={cardRef} style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.10)", width: "100%", maxWidth: 520, margin: "0 auto", fontFamily: "'Barlow Condensed','Arial Narrow',Arial,sans-serif", border: "1px solid #e8e8e8" }}>
        <div style={{ background: "#1a1a2e", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: compColor, fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>{match.competition}</span>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{match.date}</span>
          <span style={{ background: resultColor, color: "#fff", fontWeight: 800, fontSize: 12, letterSpacing: 2, padding: "3px 10px", borderRadius: 20 }}>{resultLabel}</span>
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
            <div style={{ padding: "12px 20px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ fontSize: 16 }}>⚽</span>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: compColor, letterSpacing: 2, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Goal Scorers</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#1a1a2e" }}>{match.scorers.join("  ·  ")}</span>
              </div>
            </div>
          </>
        )}
        {(match.motm || match.oppMotm) && (
          <>
            <div style={{ height: 1, background: "#eee", margin: "0 20px" }} />
            <div style={{ padding: "12px 20px 14px", display: "flex", gap: 24, flexWrap: "wrap" }}>
              {match.motm && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>⭐</span>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: compColor, letterSpacing: 2, textTransform: "uppercase", display: "block", marginBottom: 2 }}>Man of the Match</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e" }}>{match.motm}</span>
                  </div>
                </div>
              )}
              {match.oppMotm && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>🏅</span>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#aaa", letterSpacing: 2, textTransform: "uppercase", display: "block", marginBottom: 2 }}>Opp. Man of Match</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#555" }}>{match.oppMotm}</span>
                  </div>
                </div>
              )}
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
  const [mode, setMode] = useState("history");
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
  const [fixtures, setFixtures] = useState([]);

  const [editingComp, setEditingComp] = useState(null);
  const [tempCompName, setTempCompName] = useState("");
  const [filterComp, setFilterComp] = useState("All");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [editingResult, setEditingResult] = useState(null);
  const [editOppLogo, setEditOppLogo] = useState(null);
  const [oppLogo, setOppLogo] = useState(null);
  const [newResult, setNewResult] = useState(null);
  const [addingComp, setAddingComp] = useState(false);
  const [newCompName, setNewCompName] = useState("");

  // Team search / h2h
  const [teamSearch, setTeamSearch] = useState("");
  const [h2hTeam, setH2hTeam] = useState(null);

  // Fixture form
  const [showFixtureForm, setShowFixtureForm] = useState(false);
  const [editingFixture, setEditingFixture] = useState(null);
  const [fixtureForm, setFixtureForm] = useState({ date: "", opposition: "", competition: DEFAULT_COMPETITIONS[0], venue: "", notes: "" });

  const [form, setForm] = useState({ date: "", opposition: "", homeScore: "", awayScore: "", scorers: "", competition: DEFAULT_COMPETITIONS[0], motm: "", oppMotm: "" });
  const fileRef = useRef();
  const editFileRef = useRef();

  // ── Load data ──────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [r, t, f, s] = await Promise.all([fetchResults(), fetchTeams(), fetchFixtures(), fetchSeasons()]);
        setResults(r.length ? r : INITIAL_RESULTS);
        setTeams(t);
        setFixtures(f);
        if (s) { setTeamName(s.team_name || "Under 9 Blue"); setCompetitions(s.competitions || DEFAULT_COMPETITIONS); }
      } catch(e) { setDbError(true); setDbErrorMsg(e?.message || String(e)); }
      setLoading(false);
    }
    load();
  }, []);

  // ── Derived ────────────────────────────────────────────
  const filteredResults = (filterComp === "All" ? results : results.filter(r => r.competition === filterComp))
    .slice().sort((a, b) => {
      const da = new Date(a.date), db = new Date(b.date);
      return sortOrder === "desc" ? db - da : da - db;
    });

  const upcomingFixtures = fixtures
    .filter(f => new Date(f.date) >= new Date(new Date().toDateString()))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const pastFixtures = fixtures
    .filter(f => new Date(f.date) < new Date(new Date().toDateString()))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const h2hResults = h2hTeam ? results.filter(r => r.opposition.toLowerCase() === h2hTeam.toLowerCase()) : [];

  // ── Handlers ───────────────────────────────────────────
  const handleCreate = async () => {
    const hs = parseInt(form.homeScore), as_ = parseInt(form.awayScore);
    const result = hs > as_ ? "W" : hs < as_ ? "L" : "D";
    const scorerList = form.scorers ? form.scorers.split(",").map(s => s.trim()).filter(Boolean) : [];
    let displayDate = form.date;
    try { displayDate = new Date(form.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch(e) {}
    const newMatch = { date: displayDate, opposition: form.opposition, homeScore: hs, awayScore: as_, scorers: scorerList, result, competition: form.competition, motm: form.motm.trim(), oppMotm: form.oppMotm.trim(), oppLogo: oppLogo || null };
    try { const saved = await insertResult(newMatch); setResults(prev => [...prev, saved || { ...newMatch, id: Date.now() }]); setNewResult(saved || { ...newMatch, id: Date.now() }); }
    catch(e) { const m = { ...newMatch, id: Date.now() }; setResults(prev => [...prev, m]); setNewResult(m); }
  };

  const handleSaveEdit = async () => {
    if (!editingResult) return;
    const hs = parseInt(editingResult.homeScore), as_ = parseInt(editingResult.awayScore);
    const result = hs > as_ ? "W" : hs < as_ ? "L" : "D";
    const scorerList = typeof editingResult.scorers === "string" ? editingResult.scorers.split(",").map(s => s.trim()).filter(Boolean) : editingResult.scorers;
    const updated = { ...editingResult, homeScore: hs, awayScore: as_, result, scorers: scorerList, oppLogo: editOppLogo === "remove" ? null : editOppLogo !== null ? editOppLogo : editingResult.oppLogo };
    try { await updateResult(updated); } catch(e) {}
    setResults(prev => prev.map(r => r.id === updated.id ? updated : r));
    setEditingResult(null); setEditOppLogo(null);
  };

  const handleDeleteResult = async (id) => {
    try { await deleteResult(id); } catch(e) {}
    setResults(prev => prev.filter(r => r.id !== id));
    setSelectedMatch(null);
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

  const handleSaveFixture = async () => {
    let displayDate = fixtureForm.date;
    try { displayDate = new Date(fixtureForm.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch(e) {}
    const fix = { ...fixtureForm, date: displayDate, rawDate: fixtureForm.date };
    if (editingFixture) {
      const updated = { ...editingFixture, ...fix };
      try { await updateFixture(updated); } catch(e) {}
      setFixtures(prev => prev.map(f => f.id === updated.id ? updated : f));
    } else {
      try { const saved = await insertFixture(fix); setFixtures(prev => [...prev, saved || { ...fix, id: Date.now() }]); }
      catch(e) { setFixtures(prev => [...prev, { ...fix, id: Date.now() }]); }
    }
    setShowFixtureForm(false); setEditingFixture(null);
    setFixtureForm({ date: "", opposition: "", competition: competitions[0], venue: "", notes: "" });
  };

  const handleDeleteFixture = async (id) => {
    try { await deleteFixture(id); } catch(e) {}
    setFixtures(prev => prev.filter(f => f.id !== id));
  };

  const handleAddComp = () => {
    const name = newCompName.trim();
    if (name && !competitions.includes(name)) setCompetitions(prev => [...prev, name]);
    setNewCompName(""); setAddingComp(false);
  };

  const handleRenameComp = (idx) => {
    const oldName = competitions[idx], newName = tempCompName.trim();
    if (!newName || newName === oldName) { setEditingComp(null); return; }
    setCompetitions(prev => prev.map((c, i) => i === idx ? newName : c));
    setResults(prev => prev.map(r => r.competition === oldName ? { ...r, competition: newName } : r));
    if (filterComp === oldName) setFilterComp(newName);
    setEditingComp(null);
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
    <div style={{ minHeight: "100vh", background: "#f0f2f5", fontFamily: "'Barlow Condensed','Arial Narrow',Arial,sans-serif", paddingBottom: 60 }}>

      {/* Top bar */}
      <div style={{ background: "#1a1a2e", padding: "16px 24px", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
        <div style={{ background: "#f0f4ff", borderRadius: 10, padding: 4, display: "flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, flexShrink: 0 }}>
          <LeonLogo size={48} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 22, letterSpacing: 1, lineHeight: 1 }}>SUNDERLAND LEON</div>
          {editingTeamName ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <input autoFocus value={tempTeamName} onChange={e => setTempTeamName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { setTeamName(tempTeamName); setEditingTeamName(false); } if (e.key === "Escape") setEditingTeamName(false); }}
                style={{ background: "rgba(255,255,255,0.15)", border: "1px solid #87ceeb", borderRadius: 6, color: "#fff", fontSize: 13, fontWeight: 700, letterSpacing: 2, padding: "3px 8px", fontFamily: "inherit", width: 160, outline: "none", textTransform: "uppercase" }} />
              <button onClick={() => { setTeamName(tempTeamName); setEditingTeamName(false); }} style={{ background: "#87ceeb", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontWeight: 800, fontSize: 12, color: "#1a1a2e", fontFamily: "inherit" }}>Save</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
              <div style={{ color: "#87ceeb", fontWeight: 700, fontSize: 13, letterSpacing: 3, textTransform: "uppercase" }}>{teamName}</div>
              <button onClick={() => { setTempTeamName(teamName); setEditingTeamName(true); }} style={{ background: "rgba(135,206,235,0.2)", border: "1px solid rgba(135,206,235,0.4)", borderRadius: 5, padding: "2px 8px", cursor: "pointer", color: "#87ceeb", fontSize: 10, fontWeight: 700, fontFamily: "inherit" }}>✏️ EDIT</button>
            </div>
          )}
        </div>
      </div>

      {/* Tab nav */}
      <div style={{ display: "flex", background: "#fff", borderBottom: "2px solid #e8e8e8", overflowX: "auto" }}>
        {[
          { key: "fixtures", label: "📅 Fixtures" },
          { key: "history", label: "📋 Results" },
          { key: "scorers", label: "⭐ Awards" },
          { key: "teams", label: "👥 Teams" },
          { key: "new", label: "➕ New" },
        ].map(tab => (
          <button key={tab.key} onClick={() => { setMode(tab.key); setNewResult(null); setOppLogo(null); setH2hTeam(null); }}
            style={{ flex: "0 0 auto", padding: "14px 16px", border: "none", background: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: mode === tab.key ? "#1a1a2e" : "#999", borderBottom: mode === tab.key ? "3px solid #87ceeb" : "3px solid transparent", whiteSpace: "nowrap" }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Competition filter — shown on Results and Awards tabs */}
      {(mode === "history" || mode === "scorers") && (
        <div style={{ background: "#fff", borderBottom: "1px solid #f0f0f0", padding: "10px 16px", display: "flex", gap: 8, overflowX: "auto", alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#aaa", letterSpacing: 2, whiteSpace: "nowrap", textTransform: "uppercase" }}>Filter:</span>
          {["All", ...competitions].map((comp, idx) => {
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
                    <button onClick={() => { setFilterComp(comp); setSelectedMatch(null); }}
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

      <div style={{ padding: "20px 16px" }}>

        {/* ── FIXTURES TAB ── */}
        {mode === "fixtures" && (
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#888", letterSpacing: 2, textTransform: "uppercase" }}>Upcoming Fixtures</span>
              <button onClick={() => { setShowFixtureForm(true); setEditingFixture(null); setFixtureForm({ date: "", opposition: "", competition: competitions[0], venue: "", notes: "" }); }}
                style={{ background: "#1a1a2e", color: "#87ceeb", border: "none", borderRadius: 10, padding: "8px 16px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                + Add Fixture
              </button>
            </div>

            {upcomingFixtures.length === 0 && <p style={{ textAlign: "center", color: "#bbb", fontSize: 15, marginTop: 20 }}>No upcoming fixtures.</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {upcomingFixtures.map(f => {
                const cc = getCompColor(competitions, f.competition);
                return (
                  <div key={f.id} style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", borderLeft: `4px solid ${cc}` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: cc, letterSpacing: 2, textTransform: "uppercase" }}>{f.competition}</span>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => { setEditingFixture(f); setFixtureForm({ date: f.rawDate || "", opposition: f.opposition, competition: f.competition, venue: f.venue || "", notes: f.notes || "" }); setShowFixtureForm(true); }}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#aaa" }}>✏️</button>
                        <button onClick={() => { if (window.confirm("Delete this fixture?")) handleDeleteFixture(f.id); }}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#d50000" }}>🗑️</button>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ background: "#f0f4ff", borderRadius: 10, padding: "8px 14px", textAlign: "center", minWidth: 70 }}>
                        <div style={{ fontSize: 20, fontWeight: 900, color: "#1a1a2e" }}>{new Date(f.rawDate || f.date).getDate()}</div>
                        <div style={{ fontSize: 11, color: "#888", fontWeight: 700 }}>{new Date(f.rawDate || f.date).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: "#1a1a2e" }}>vs {f.opposition}</div>
                        {f.venue && <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>📍 {f.venue}</div>}
                        {f.notes && <div style={{ fontSize: 13, color: "#aaa", marginTop: 2 }}>💬 {f.notes}</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {pastFixtures.length > 0 && (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#888", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Past Fixtures</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {pastFixtures.map(f => (
                    <div key={f.id} style={{ background: "#fff", borderRadius: 12, padding: "12px 18px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", opacity: 0.7, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e" }}>vs {f.opposition}</div>
                        <div style={{ fontSize: 12, color: "#aaa" }}>{f.date} {f.venue ? `· ${f.venue}` : ""}</div>
                      </div>
                      <button onClick={() => { if (window.confirm("Delete this fixture?")) handleDeleteFixture(f.id); }}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#ddd" }}>🗑️</button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Fixture form modal */}
            {showFixtureForm && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                    <span style={{ fontSize: 18, fontWeight: 900, color: "#1a1a2e", letterSpacing: 1 }}>{editingFixture ? "✏️ EDIT FIXTURE" : "📅 ADD FIXTURE"}</span>
                    <button onClick={() => { setShowFixtureForm(false); setEditingFixture(null); }} style={{ background: "#f0f0f0", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 800, fontSize: 14, color: "#888", fontFamily: "inherit" }}>✕</button>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Competition</label>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {competitions.map(comp => (
                        <button key={comp} onClick={() => setFixtureForm(f => ({ ...f, competition: comp }))}
                          style={{ padding: "6px 12px", borderRadius: 20, border: fixtureForm.competition === comp ? "none" : "1.5px solid #e0e0e0", background: fixtureForm.competition === comp ? "#1a1a2e" : "#fff", color: fixtureForm.competition === comp ? "#87ceeb" : "#888", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase" }}>
                          {comp}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Date</label>
                    <input type="date" value={fixtureForm.date} onChange={e => setFixtureForm(f => ({ ...f, date: e.target.value }))} style={{ ...inputStyle, colorScheme: "light" }} />
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Opposition</label>
                    <TeamPicker teams={teams} value={fixtureForm.opposition} onChange={v => setFixtureForm(f => ({ ...f, opposition: v }))} onAddNew={name => { handleAddTeam(name); setFixtureForm(f => ({ ...f, opposition: name })); }} />
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Venue (optional)</label>
                    <input type="text" placeholder="e.g. Herrington Park" value={fixtureForm.venue} onChange={e => setFixtureForm(f => ({ ...f, venue: e.target.value }))} style={inputStyle} />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>Notes (optional)</label>
                    <input type="text" placeholder="e.g. Bring blue kit" value={fixtureForm.notes} onChange={e => setFixtureForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle} />
                  </div>

                  <button onClick={handleSaveFixture} disabled={!fixtureForm.date || !fixtureForm.opposition}
                    style={{ width: "100%", padding: "15px", background: "#1a1a2e", color: "#87ceeb", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", opacity: !fixtureForm.date || !fixtureForm.opposition ? 0.5 : 1 }}>
                    {editingFixture ? "Save Changes" : "Add Fixture"}
                  </button>
                </div>
              </div>
            )}
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

            {filteredResults.length === 0 && <p style={{ textAlign: "center", color: "#bbb", fontSize: 15, marginTop: 40 }}>No results yet.</p>}

            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 520, margin: "0 auto" }}>
              {filteredResults.map((m) => {
                const cc = getCompColor(competitions, m.competition);
                const isSelected = selectedMatch === m.id;
                return (
                  <div key={m.id}>
                    <button onClick={() => setSelectedMatch(isSelected ? null : m.id)}
                      style={{ width: "100%", background: isSelected ? "#f8faff" : "#fff", border: "none", borderRadius: isSelected ? "12px 12px 0 0" : 12, cursor: "pointer", padding: "14px 18px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.07)", borderLeft: `4px solid ${m.result === "W" ? "#00c853" : m.result === "L" ? "#d50000" : "#ffab00"}`, fontFamily: "inherit" }}>
                      <span style={{ background: m.result === "W" ? "#00c853" : m.result === "L" ? "#d50000" : "#ffab00", color: "#fff", fontWeight: 800, fontSize: 13, borderRadius: 8, padding: "3px 8px", minWidth: 34 }}>{m.result}</span>
                      <span style={{ flex: 1, textAlign: "left", fontSize: 15, fontWeight: 700, color: "#1a1a2e" }}>vs {m.opposition}</span>
                      {m.motm && <span style={{ fontSize: 12, color: "#888" }}>⭐ {m.motm}</span>}
                      <span style={{ fontSize: 9, fontWeight: 700, color: cc, background: "#f5f5f5", borderRadius: 10, padding: "2px 8px", letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap" }}>{m.competition}</span>
                      <span style={{ fontSize: 20, fontWeight: 900, color: "#1a1a2e" }}>{m.homeScore}–{m.awayScore}</span>
                      <span style={{ fontSize: 12, color: "#aaa", minWidth: 72, textAlign: "right" }}>{m.date}</span>
                    </button>

                    {isSelected && (
                      <div style={{ background: "#f8faff", borderRadius: "0 0 12px 12px", boxShadow: "0 4px 8px rgba(0,0,0,0.06)", overflow: "hidden" }}>
                        <div style={{ display: "flex", borderTop: "1px solid #e8eeff" }}>
                          <button onClick={() => setEditingResult({ ...m, scorers: (m.scorers || []).join(", ") })}
                            style={{ flex: 1, padding: "12px", background: "none", border: "none", borderRight: "1px solid #e8eeff", cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 13, color: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                            ✏️ Edit
                          </button>
                          <button onClick={() => { if (window.confirm(`Delete result vs ${m.opposition}?`)) handleDeleteResult(m.id); }}
                            style={{ flex: 1, padding: "12px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 13, color: "#d50000", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                            🗑️ Delete
                          </button>
                        </div>
                        <div style={{ padding: 16 }}>
                          <ResultCard match={m} teamName={teamName} compColor={getCompColor(competitions, m.competition)} />
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
                      {competitions.map(comp => (
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
                    <label style={labelStyle}>Goal Scorers (comma separated)</label>
                    <input type="text" value={typeof editingResult.scorers === "string" ? editingResult.scorers : (editingResult.scorers || []).join(", ")} onChange={e => setEditingResult(r => ({ ...r, scorers: e.target.value }))} style={inputStyle} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                    <div>
                      <label style={labelStyle}>⭐ Man of Match</label>
                      <input type="text" value={editingResult.motm || ""} onChange={e => setEditingResult(r => ({ ...r, motm: e.target.value }))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, color: "#aaa" }}>🏅 Opp MOTM</label>
                      <input type="text" value={editingResult.oppMotm || ""} onChange={e => setEditingResult(r => ({ ...r, oppMotm: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>Opposition Logo</label>
                    <input ref={editFileRef} type="file" accept="image/*" onChange={e => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = ev => setEditOppLogo(ev.target.result); reader.readAsDataURL(file); }} style={{ display: "none" }} />
                    <button onClick={() => editFileRef.current.click()}
                      style={{ border: "2px dashed #87ceeb", borderRadius: 10, background: (editOppLogo || editingResult.oppLogo) ? "#e8f4ff" : "#f8faff", padding: "12px 16px", width: "100%", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: "#1a1a2e", display: "flex", alignItems: "center", gap: 10, justifyContent: "center", boxSizing: "border-box" }}>
                      {(editOppLogo || editingResult.oppLogo) ? <img src={editOppLogo || editingResult.oppLogo} style={{ width: 36, height: 36, objectFit: "contain" }} alt="" /> : "📁"}
                      {(editOppLogo || editingResult.oppLogo) ? "Logo uploaded ✓ (tap to change)" : "Upload opposition logo"}
                    </button>
                    {(editOppLogo || editingResult.oppLogo) && <button onClick={() => setEditOppLogo("remove")} style={{ marginTop: 6, background: "none", border: "none", color: "#d50000", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✕ Remove logo</button>}
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
        {mode === "teams" && (
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
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                  {teams.filter(t => t.name.toLowerCase().includes(teamSearch.toLowerCase())).map(t => (
                    <div key={t.id} style={{ background: "#fff", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                      {t.logo ? <img src={t.logo} style={{ width: 40, height: 40, objectFit: "contain" }} alt="" /> : <span style={{ fontSize: 28 }}>⚽</span>}
                      <span style={{ flex: 1, fontSize: 16, fontWeight: 800, color: "#1a1a2e" }}>{t.name}</span>
                      <button onClick={() => { setH2hTeam(t.name); setTeamSearch(t.name); }}
                        style={{ background: "#f0f4ff", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 12, color: "#87ceeb" }}>
                        H2H
                      </button>
                      <button onClick={() => { if (window.confirm(`Remove ${t.name}?`)) handleDeleteTeam(t.id); }}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#ddd" }}>🗑️</button>
                    </div>
                  ))}
                  {teams.length === 0 && <p style={{ textAlign: "center", color: "#bbb", fontSize: 14 }}>No teams added yet. Teams are added automatically when you enter results.</p>}
                </div>

                <button onClick={() => handleAddTeam(teamSearch || "New Team")}
                  style={{ width: "100%", padding: "13px", background: "#1a1a2e", color: "#87ceeb", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 800, letterSpacing: 1, cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase" }}>
                  + Add Team Manually
                </button>
              </>
            )}
          </div>
        )}

        {/* ── NEW RESULT TAB ── */}
        {mode === "new" && (
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
                    <input type="number" placeholder="0" value={form.homeScore} onChange={e => setForm(f => ({ ...f, homeScore: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Opp Score</label>
                    <input type="number" placeholder="0" value={form.awayScore} onChange={e => setForm(f => ({ ...f, awayScore: e.target.value }))} style={inputStyle} />
                  </div>
                </div>

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

                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>Opposition Logo (optional)</label>
                  <input ref={fileRef} type="file" accept="image/*" onChange={e => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = ev => setOppLogo(ev.target.result); reader.readAsDataURL(file); }} style={{ display: "none" }} />
                  <button onClick={() => fileRef.current.click()}
                    style={{ border: "2px dashed #87ceeb", borderRadius: 10, background: oppLogo ? "#e8f4ff" : "#f8faff", padding: "14px 20px", width: "100%", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: "#1a1a2e", display: "flex", alignItems: "center", gap: 10, justifyContent: "center", boxSizing: "border-box" }}>
                    {oppLogo ? <img src={oppLogo} style={{ width: 36, height: 36, objectFit: "contain" }} alt="" /> : "📁"}
                    {oppLogo ? "Logo uploaded ✓" : "Upload opposition logo"}
                  </button>
                </div>

                <button onClick={handleCreate} disabled={!form.date || !form.opposition || form.homeScore === "" || form.awayScore === ""}
                  style={{ width: "100%", padding: "16px", background: "#1a1a2e", color: "#87ceeb", border: "none", borderRadius: 12, fontSize: 17, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", opacity: (!form.date || !form.opposition || form.homeScore === "" || form.awayScore === "") ? 0.5 : 1 }}>
                  Generate Result Card
                </button>
              </div>
            ) : (
              <div>
                <ResultCard match={newResult} teamName={teamName} compColor={getCompColor(competitions, newResult.competition)} />
                <button onClick={() => { setNewResult(null); setOppLogo(null); setForm({ date: "", opposition: "", homeScore: "", awayScore: "", scorers: "", competition: form.competition, motm: "", oppMotm: "" }); }}
                  style={{ marginTop: 16, width: "100%", padding: "14px", background: "#fff", color: "#1a1a2e", border: "2px solid #e8e8e8", borderRadius: 12, fontSize: 15, fontWeight: 800, letterSpacing: 2, cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase" }}>
                  ← Add Another Result
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
