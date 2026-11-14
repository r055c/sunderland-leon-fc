// Unofficial league table screen: view the table, add results by pasting messages (primary) or typing them in (backup).
import { useState, useMemo, useRef } from "react";
import { parsePaste, matchTeam, computeTable, normName, toISO } from "./leagueTable.js";
import { PosterCanvas, POSTER_W, POSTER_H, findTeamLogo } from "./Poster.jsx";

const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const niceDate = (iso) => { try { return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return iso; } };

export default function LeagueScreen({ T, isAdmin, seasonId, seasonName, selfName, selfNames, teams, matches, start, ownLeague, branding, posterBase, onAdd, onDelete, showToast, onBack, loadH2c, ensureFonts }) {
  const [tab, setTab] = useState("table"); // table | paste | manual | list
  const [text, setText] = useState("");
  const [date, setDate] = useState(todayISO());
  const [preview, setPreview] = useState(null); // { rows, skipped }
  const [busy, setBusy] = useState(false);
  const [man, setMan] = useState({ home: "", away: "", hg: "", ag: "", date: todayISO() });
  const [poster, setPoster] = useState(false);
  const [posterBusy, setPosterBusy] = useState(false);
  const posterRef = useRef();

  const teamNames = useMemo(() => teams.map(t => t.name).filter(Boolean), [teams]);
  const table = useMemo(() => computeTable({ matches, own: ownLeague, start, selfName }), [matches, ownLeague, start, selfName]);
  const lastDate = useMemo(() => [...matches.map(m => m.date), ...ownLeague.map(r => toISO(r.date))].filter(Boolean).sort().pop() || "", [matches, ownLeague]);

  const card = { background: T.white, borderRadius: 14, padding: 14, boxShadow: "0 2px 8px rgba(18,23,46,0.06)", marginBottom: 12 };
  const inp = { width: "100%", padding: "10px 12px", border: "2px solid #e8e8e8", borderRadius: 10, fontSize: 15, fontFamily: "inherit", color: T.navy, outline: "none", boxSizing: "border-box" };
  const btn = (primary, off) => ({ padding: "12px 16px", border: primary ? "none" : `1.5px solid ${T.ink30}`, borderRadius: 11, background: primary ? T.navy : "#fff", color: primary ? T.sky : T.ink60, fontWeight: 800, fontSize: 13, letterSpacing: 0.5, fontFamily: "inherit", cursor: off ? "default" : "pointer", opacity: off ? 0.45 : 1 });
  const tabBtn = (k, label) => (
    <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: "9px 4px", border: "none", borderRadius: 9, background: tab === k ? T.navy : "transparent", color: tab === k ? T.sky : T.ink60, fontWeight: 800, fontSize: 12, fontFamily: "inherit", cursor: "pointer" }}>{label}</button>
  );

  const isSelf = n => normName(n) === normName(selfName) || selfNames.some(s => normName(s) === normName(n));
  const dupKey = (d, h, a) => `${d}|${normName(h)}|${normName(a)}`;
  const existing = useMemo(() => new Set(matches.map(m => dupKey(m.date, m.home, m.away))), [matches]);

  const readPaste = () => {
    const out = parsePaste(text, teamNames, selfNames);
    out.rows = out.rows.map(r => ({ ...r, use: true }));
    setPreview(out);
    if (!out.rows.length) showToast("Couldn't find any scores in that");
  };
  const setRow = (i, patch) => setPreview(p => ({ ...p, rows: p.rows.map((r, j) => {
    if (j !== i) return r;
    const n = { ...r, ...patch };
    const h = matchTeam(n.home, teamNames, selfNames), a = matchTeam(n.away, teamNames, selfNames);
    return { ...n, homeStatus: h.status === "self" || h.status === "exact" ? h.status : (patch.home !== undefined ? "exact" : n.homeStatus), awayStatus: a.status === "self" || a.status === "exact" ? a.status : (patch.away !== undefined ? "exact" : n.awayStatus) };
  }) }));
  const rowIssue = r => {
    if (isSelf(r.home) || isSelf(r.away)) return "own";
    if (normName(r.home) === normName(r.away)) return "same";
    if (existing.has(dupKey(date, r.home, r.away))) return "dup";
    if (r.homeStatus === "ambiguous" || r.awayStatus === "ambiguous") return "pick";
    return "";
  };
  const usable = preview ? preview.rows.filter(r => r.use && !["own", "same", "dup", "pick"].includes(rowIssue(r))) : [];

  const savePaste = async () => {
    if (!usable.length) return;
    setBusy(true);
    try {
      await onAdd(usable.map(r => ({ season_id: seasonId, date, home: r.home.trim(), away: r.away.trim(), home_goals: r.hg, away_goals: r.ag })));
      showToast(`✅ ${usable.length} result${usable.length === 1 ? "" : "s"} added`);
      setText(""); setPreview(null); setTab("table");
    } catch (e) { showToast("❌ Couldn't save, try again"); }
    setBusy(false);
  };
  const manIssue = (() => {
    if (!man.home.trim() || !man.away.trim() || man.hg === "" || man.ag === "") return "Fill in both teams and both scores";
    if (isSelf(man.home) || isSelf(man.away)) return `${selfName}'s own games come from Log a Result`;
    if (normName(man.home) === normName(man.away)) return "Pick two different teams";
    if (existing.has(dupKey(man.date, man.home, man.away))) return "That result is already in the table";
    return "";
  })();
  const saveManual = async () => {
    if (manIssue) return;
    setBusy(true);
    try {
      const h = matchTeam(man.home, teamNames, selfNames), a = matchTeam(man.away, teamNames, selfNames);
      await onAdd([{ season_id: seasonId, date: man.date, home: h.status === "ambiguous" || h.status === "new" ? man.home.trim() : h.name, away: a.status === "ambiguous" || a.status === "new" ? man.away.trim() : a.name, home_goals: +man.hg, away_goals: +man.ag }]);
      showToast("✅ Result added");
      setMan(m => ({ ...m, home: "", away: "", hg: "", ag: "" }));
    } catch (e) { showToast("❌ Couldn't save, try again"); }
    setBusy(false);
  };

  const posterData = () => ({
    ...posterBase,
    seasonLabel: seasonName, asOf: lastDate ? `UP TO ${niceDate(lastDate)}` : "",
    rows: table.slice(0, 14).map(r => ({ ...r, logo: r.self ? null : findTeamLogo(teams, r.team) })),
  });
  const exportPoster = async share => {
    if (!posterRef.current) return;
    setPosterBusy(true);
    try {
      await ensureFonts();
      const h2c = await loadH2c();
      const canvas = await h2c(posterRef.current, { scale: 2, width: POSTER_W, height: POSTER_H, backgroundColor: null, useCORS: true, logging: false });
      const blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", 0.92));
      const name = `league-table-${todayISO()}.jpg`;
      const file = new File([blob], name, { type: "image/jpeg" });
      if (share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: "Unofficial league table" }); setPosterBusy(false); return; } catch (e) { if (e && e.name === "AbortError") { setPosterBusy(false); return; } }
      }
      const a = document.createElement("a"); a.download = name; a.href = URL.createObjectURL(blob); a.click();
      showToast("📸 Table saved");
    } catch (e) { console.error(e); showToast("❌ Couldn't make the picture"); }
    setPosterBusy(false);
  };

  const th = { padding: "8px 3px", fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: T.ink60, textAlign: "center" };
  const td = { padding: "9px 3px", fontFamily: T.mono, fontSize: 13, textAlign: "center", color: T.navy };
  const chip = (txt, bg, col) => <span style={{ fontSize: 10, fontWeight: 800, background: bg, color: col, borderRadius: 6, padding: "2px 6px", marginLeft: 6 }}>{txt}</span>;
  const statusChip = (st, who) => st === "ambiguous" ? chip("PICK ONE", "#fde8c8", "#a35a00") : st === "new" ? chip("NEW TEAM", "#e6eefc", "#2b5aa8") : st === "close" ? chip("MATCHED", "#e3f4ea", "#1f7a46") : null;

  const W = Math.min(340, (typeof window !== "undefined" ? window.innerWidth : 390) - 64), sc = W / POSTER_W;

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: T.ink60, fontFamily: T.mono, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", padding: "0 0 12px" }}>‹ Back</button>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 20, color: T.navy }}>League table</div>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, background: "#fde8c8", color: "#a35a00", borderRadius: 6, padding: "3px 8px" }}>UNOFFICIAL</span>
      </div>
      <div style={{ fontSize: 12, color: T.ink60, marginBottom: 12 }}>{[branding.league_name, seasonName].filter(Boolean).join(" · ")} · based on results we've been sent{lastDate ? `, up to ${niceDate(lastDate)}` : ""}</div>

      {isAdmin && (
        <div style={{ display: "flex", gap: 4, background: "#eef0f5", borderRadius: 11, padding: 4, marginBottom: 12 }}>
          {tabBtn("table", "Table")}{tabBtn("paste", "Paste results")}{tabBtn("manual", "Type one in")}{tabBtn("list", "Added")}
        </div>
      )}

      {tab === "table" && (
        <div style={{ ...card, padding: "6px 8px" }}>
          {table.length === 0 ? (
            <div style={{ textAlign: "center", padding: "28px 12px", color: T.ink60, fontSize: 13 }}>No results yet.{isAdmin ? " Use Paste results to add the scores people send you." : ""}</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={{ ...th, width: 22 }}>#</th><th style={{ ...th, textAlign: "left" }}>TEAM</th>{["P", "W", "D", "L", "GD", "PTS"].map(h => <th key={h} style={{ ...th, width: h === "GD" || h === "PTS" ? 34 : 24 }}>{h}</th>)}</tr></thead>
              <tbody>
                {table.map((r, i) => (
                  <tr key={r.team} style={{ background: r.self ? `${T.sky}33` : i % 2 ? "transparent" : "#f6f7fb", borderBottom: "1px solid #eef0f5" }}>
                    <td style={{ ...td, fontWeight: 700, color: T.ink60 }}>{i + 1}</td>
                    <td style={{ ...td, textAlign: "left", fontFamily: T.body, fontWeight: r.self ? 800 : 600, fontSize: 13 }}>{r.team}</td>
                    <td style={td}>{r.p}</td><td style={td}>{r.w}</td><td style={td}>{r.d}</td><td style={td}>{r.l}</td>
                    <td style={td}>{r.gd > 0 ? "+" : ""}{r.gd}</td><td style={{ ...td, fontWeight: 800 }}>{r.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {tab === "table" && table.length > 0 && <button onClick={() => setPoster(true)} style={{ ...btn(true), width: "100%" }}>🖼 SHARE AS A PICTURE</button>}

      {tab === "paste" && isAdmin && (
        <div style={card}>
          <div style={{ fontSize: 12, color: T.ink60, marginBottom: 8 }}>Copy the scores from the WhatsApp group and paste them here, one game per line, e.g. <b>Tigons 3 Rutherford 7</b> or <b>Whitburn 3 - 0 Gateshead Fell</b>. Your own games are taken from the results you've logged.</div>
          <textarea value={text} onChange={e => { setText(e.target.value); setPreview(null); }} rows={7} placeholder={"Tigons 3 Rutherford 7\nHebburn 2 - 0 Sunderland West End"} style={{ ...inp, resize: "vertical" }} />
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.skyInk, letterSpacing: 2, margin: "10px 0 5px", textTransform: "uppercase" }}>Date these games were played</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} />
          <button onClick={readPaste} disabled={!text.trim()} style={{ ...btn(true, !text.trim()), width: "100%", marginTop: 12 }}>READ THE SCORES</button>

          {preview && (
            <div style={{ marginTop: 14 }}>
              <datalist id="lt-teams">{teamNames.map(n => <option key={n} value={n} />)}</datalist>
              {preview.rows.length > 0 && <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: T.skyInk, marginBottom: 6 }}>CHECK THESE, THEN ADD</div>}
              {preview.rows.map((r, i) => {
                const issue = rowIssue(r);
                return (
                  <div key={i} style={{ border: `1.5px solid ${issue ? "#f0d9b5" : "#e8e8e8"}`, borderRadius: 11, padding: 9, marginBottom: 8, opacity: r.use ? 1 : 0.5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input type="checkbox" checked={r.use} onChange={e => setRow(i, { use: e.target.checked })} />
                      <input list="lt-teams" value={r.home} onChange={e => setRow(i, { home: e.target.value })} style={{ ...inp, padding: "7px 8px", fontSize: 13, flex: 1, minWidth: 0 }} />
                      <input type="number" min="0" value={r.hg} onChange={e => setRow(i, { hg: +e.target.value })} style={{ ...inp, width: 46, padding: "7px 2px", textAlign: "center", fontWeight: 800 }} />
                      <span style={{ color: T.ink60 }}>-</span>
                      <input type="number" min="0" value={r.ag} onChange={e => setRow(i, { ag: +e.target.value })} style={{ ...inp, width: 46, padding: "7px 2px", textAlign: "center", fontWeight: 800 }} />
                      <input list="lt-teams" value={r.away} onChange={e => setRow(i, { away: e.target.value })} style={{ ...inp, padding: "7px 8px", fontSize: 13, flex: 1, minWidth: 0 }} />
                    </div>
                    <div style={{ fontSize: 11, marginTop: 5, color: T.ink60 }}>
                      {r.homeStatus === "ambiguous" && r.homeCands.map(c => <button key={c} onClick={() => setRow(i, { home: c, homeStatus: "exact" })} style={{ marginRight: 6, marginBottom: 3, fontSize: 11, border: `1px solid ${T.ink30}`, background: "#fff", borderRadius: 8, padding: "3px 8px", cursor: "pointer", fontFamily: "inherit" }}>{c}</button>)}
                      {r.awayStatus === "ambiguous" && r.awayCands.map(c => <button key={c} onClick={() => setRow(i, { away: c, awayStatus: "exact" })} style={{ marginRight: 6, marginBottom: 3, fontSize: 11, border: `1px solid ${T.ink30}`, background: "#fff", borderRadius: 8, padding: "3px 8px", cursor: "pointer", fontFamily: "inherit" }}>{c}</button>)}
                      {statusChip(r.homeStatus)}{statusChip(r.awayStatus)}
                      {issue === "own" && <span style={{ color: "#a35a00", fontWeight: 700 }}> Your own game: skipped (counted from your logged results)</span>}
                      {issue === "dup" && <span style={{ color: "#a35a00", fontWeight: 700 }}> Already added for this date</span>}
                      {issue === "same" && <span style={{ color: "#a35a00", fontWeight: 700 }}> Same team on both sides</span>}
                      {issue === "pick" && <span style={{ color: "#a35a00", fontWeight: 700 }}> Tap the right team</span>}
                    </div>
                  </div>
                );
              })}
              {preview.skipped.length > 0 && (
                <div style={{ fontSize: 11, color: T.ink60, margin: "6px 0 10px" }}>Couldn't read {preview.skipped.length === 1 ? "this line" : "these lines"}: {preview.skipped.map((l, i) => <div key={i} style={{ fontStyle: "italic" }}>“{l}”</div>)}Add {preview.skipped.length === 1 ? "it" : "them"} with Type one in.</div>
              )}
              {preview.rows.length > 0 && <button onClick={savePaste} disabled={busy || !usable.length} style={{ ...btn(true, busy || !usable.length), width: "100%" }}>{busy ? "ADDING..." : `ADD ${usable.length} RESULT${usable.length === 1 ? "" : "S"}`}</button>}
            </div>
          )}
        </div>
      )}

      {tab === "manual" && isAdmin && (
        <div style={card}>
          <datalist id="lt-teams">{teamNames.map(n => <option key={n} value={n} />)}</datalist>
          <div style={{ fontSize: 12, color: T.ink60, marginBottom: 8 }}>For when a score can't be pasted. Start typing and pick a team from the list, or type a new name.</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input list="lt-teams" placeholder="Home team" value={man.home} onChange={e => setMan({ ...man, home: e.target.value })} style={{ ...inp, flex: 1, minWidth: 0 }} />
            <input type="number" min="0" inputMode="numeric" value={man.hg} onChange={e => setMan({ ...man, hg: e.target.value })} style={{ ...inp, width: 54, textAlign: "center", fontWeight: 800 }} />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
            <input list="lt-teams" placeholder="Away team" value={man.away} onChange={e => setMan({ ...man, away: e.target.value })} style={{ ...inp, flex: 1, minWidth: 0 }} />
            <input type="number" min="0" inputMode="numeric" value={man.ag} onChange={e => setMan({ ...man, ag: e.target.value })} style={{ ...inp, width: 54, textAlign: "center", fontWeight: 800 }} />
          </div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.skyInk, letterSpacing: 2, margin: "10px 0 5px", textTransform: "uppercase" }}>Date played</label>
          <input type="date" value={man.date} onChange={e => setMan({ ...man, date: e.target.value })} style={inp} />
          {manIssue && (man.home || man.away) && <div style={{ fontSize: 12, color: "#a35a00", fontWeight: 700, marginTop: 8 }}>{manIssue}</div>}
          <button onClick={saveManual} disabled={busy || !!manIssue} style={{ ...btn(true, busy || !!manIssue), width: "100%", marginTop: 12 }}>{busy ? "ADDING..." : "ADD RESULT"}</button>
        </div>
      )}

      {tab === "list" && isAdmin && (
        <div style={card}>
          {matches.length === 0 && <div style={{ fontSize: 13, color: T.ink60, textAlign: "center", padding: 16 }}>Nothing added yet.</div>}
          {matches.map(m => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid #eef0f5" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.navy }}>{m.home} {m.home_goals} - {m.away_goals} {m.away}</div>
                <div style={{ fontSize: 11, color: T.ink60 }}>{niceDate(m.date)}</div>
              </div>
              <button onClick={() => { if (window.confirm(`Remove ${m.home} ${m.home_goals}-${m.away_goals} ${m.away}?`)) onDelete(m.id); }} style={{ background: "none", border: "none", color: T.loss, fontWeight: 800, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>Delete</button>
            </div>
          ))}
        </div>
      )}

      {poster && (() => {
        const d = posterData();
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 12, overflowY: "auto" }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: 18, width: "100%", maxWidth: 420 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 17, fontWeight: 900, color: T.navy }}>🖼 LEAGUE TABLE</span>
                <button onClick={() => setPoster(false)} style={{ background: "#f0f0f0", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 800, fontSize: 14, color: "#888", fontFamily: "inherit" }}>✕</button>
              </div>
              {table.length > 14 && <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: "#b36b00" }}>Only the top 14 teams fit on the picture.</div>}
              <div style={{ margin: "14px auto 0", width: W, height: POSTER_H * sc, overflow: "hidden", borderRadius: 8, boxShadow: "0 2px 10px rgba(0,0,0,0.25)" }}>
                <div style={{ width: POSTER_W, height: POSTER_H, transform: `scale(${sc})`, transformOrigin: "top left" }}><PosterCanvas layout="league" d={d} /></div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button onClick={() => exportPoster(false)} disabled={posterBusy} style={{ ...btn(true, posterBusy), flex: 1 }}>{posterBusy ? "MAKING..." : "SAVE JPG"}</button>
                {typeof navigator !== "undefined" && !!navigator.share && <button onClick={() => exportPoster(true)} disabled={posterBusy} style={{ flex: 1, padding: 13, border: "none", borderRadius: 11, background: "#1877f2", color: "#fff", fontWeight: 800, fontSize: 13, letterSpacing: 1, fontFamily: "inherit", cursor: "pointer", opacity: posterBusy ? 0.5 : 1 }}>SHARE</button>}
              </div>
            </div>
            <div style={{ position: "fixed", left: -10000, top: 0, width: POSTER_W, height: POSTER_H, pointerEvents: "none" }} aria-hidden="true">
              <div ref={posterRef} style={{ width: POSTER_W, height: POSTER_H }}><PosterCanvas layout="league" d={d} /></div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
