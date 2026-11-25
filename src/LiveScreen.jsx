// Live match screen: set up the game, run the clock, record goals with their minute, and finish by saving the result.
import { L } from "./branding.js";
import { SBadge, Icon } from "./sportsUI.jsx";
import { useState, useEffect } from "react";
import { clockText, minuteOf, PHASE_LABEL, pauseForHalfTime, startSecondHalf, goalsOf, scoreOf, newGoalId, sortedGoals } from "./liveMatch.js";

export default function LiveScreen({ T, live, players, fixtures, competitions, selfName, badge, oppLogo, startFixtureId, onStart, onUpdate, onEnd, onDiscard, showToast, onBack }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(n => n + 1), 1000); return () => clearInterval(t); }, []);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState(null); // { id, side, min, name, own }

  // ── setup state ──
  const todayISO = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
  const upcoming = fixtures.filter(f => f.rawDate >= todayISO).slice(0, 6);
  const [pick, setPick] = useState(() => startFixtureId ?? upcoming.find(f => f.rawDate === todayISO)?.id ?? null); // fixture id, or "other"
  const [opp, setOpp] = useState("");
  const [comp, setComp] = useState("");
  const [ha, setHa] = useState("H");
  const [squad, setSquad] = useState(() => players.map(p => p.id));
  const fx = fixtures.find(f => f.id === pick) || null;

  const card = { background: T.white, borderRadius: 14, padding: 14, boxShadow: "0 2px 8px rgba(18,23,46,0.06)", marginBottom: 12 };
  const lab = { display: "block", fontSize: 11, fontWeight: 700, color: T.skyInk, letterSpacing: 2, margin: "12px 0 6px", textTransform: "uppercase" };
  const inp = { width: "100%", padding: "10px 12px", border: `2px solid ${L("#e8e8e8")}`, borderRadius: 10, fontSize: 15, fontFamily: "inherit", color: T.text, outline: "none", boxSizing: "border-box", background: L("#fff") };
  const btn = (bg, color, off) => ({ display: "block", width: "100%", padding: 14, border: bg === "#fff" ? `1.5px solid ${T.ink30}` : "none", borderRadius: 12, background: bg === "#fff" ? L("#fff") : bg, color, fontWeight: 800, fontSize: 14, letterSpacing: 1, fontFamily: "inherit", cursor: off ? "default" : "pointer", opacity: off ? 0.45 : 1 });

  // ── 1. nothing live yet: choose the game and the squad ──
  if (!live) {
    const oppName = fx ? fx.opposition : opp.trim();
    const compName = fx ? fx.competition : comp;
    const canStart = !!oppName && !!compName && squad.length > 0 && !busy;
    const start = async () => {
      setBusy(true);
      try {
        await onStart({ fixture_id: fx ? fx.id : null, opposition: oppName, competition: compName, home_away: fx ? (fx.home_away || "H") : ha, venue: fx ? (fx.venue || "") : "", squad });
      } catch (e) { showToast("❌ Couldn't start the match"); }
      setBusy(false);
    };
    return (
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: T.ink60, fontFamily: T.mono, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", padding: "0 0 12px" }}>‹ Back</button>
        <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 20, color: T.text, marginBottom: 10 }}>Live match</div>
        <div style={card}>
          <span style={{ ...lab, marginTop: 0 }}>Which game?</span>
          {upcoming.map(f => (
            <button key={f.id} onClick={() => setPick(f.id)} style={{ width: "100%", textAlign: "left", display: "block", padding: "10px 12px", marginBottom: 6, borderRadius: 10, border: `2px solid ${pick === f.id ? T.navy : L("#e8e8e8")}`, background: pick === f.id ? `${T.sky}22` : L("#fff"), fontFamily: "inherit", cursor: "pointer" }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{f.home_away === "A" ? "Away" : "Home"} · {f.opposition}</div>
              <div style={{ fontSize: 11, color: T.ink60 }}>{[new Date(f.rawDate + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }), f.kickoff_time && `KO ${f.kickoff_time}`, f.competition].filter(Boolean).join(" · ")}</div>
            </button>
          ))}
          <button onClick={() => setPick("other")} style={{ width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 10, border: `2px dashed ${pick === "other" ? T.navy : T.ink30}`, background: pick === "other" ? `${T.sky}22` : L("#fff"), fontWeight: 700, fontSize: 14, color: T.text, fontFamily: "inherit", cursor: "pointer" }}>Another game (not in Fixtures)</button>
          {pick === "other" && (
            <>
              <span style={lab}>Opposition</span>
              <input value={opp} onChange={e => setOpp(e.target.value)} placeholder="Team name" style={inp} />
              <span style={lab}>Competition</span>
              <select value={comp} onChange={e => setComp(e.target.value)} style={inp}><option value="">Choose…</option>{competitions.map(c => <option key={c} value={c}>{c}</option>)}</select>
              <span style={lab}>Home or away</span>
              <div style={{ display: "flex", gap: 8 }}>{[["H", "Home"], ["A", "Away"]].map(([k, l]) => <button key={k} onClick={() => setHa(k)} style={{ flex: 1, padding: 10, borderRadius: 10, border: `2px solid ${ha === k ? T.navy : L("#e8e8e8")}`, background: ha === k ? T.navy : L("#fff"), color: ha === k ? T.sky : T.text, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>{l}</button>)}</div>
            </>
          )}
        </div>
        <div style={card}>
          <span style={{ ...lab, marginTop: 0 }}>Who's playing?</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {players.map(p => { const on = squad.includes(p.id); return (
              <button key={p.id} onClick={() => setSquad(s => on ? s.filter(x => x !== p.id) : [...s, p.id])} style={{ padding: "10px 6px", borderRadius: 10, border: `2px solid ${on ? T.navy : L("#e8e8e8")}`, background: on ? T.navy : L("#fff"), color: on ? T.sky : T.ink60, fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>{p.squad_number ? `${p.squad_number} · ` : ""}{p.name}</button>
            ); })}
          </div>
        </div>
        <button onClick={start} disabled={!canStart} style={btn(T.pitch, "#fff", !canStart)}>▶ START MATCH</button>
        <div style={{ fontSize: 12, color: T.ink60, marginTop: 10, textAlign: "center" }}>The clock keeps time even if your phone locks.</div>
      </div>
    );
  }

  // ── 2. live ──
  const now = Date.now();
  const score = scoreOf(live);
  const away = live.home_away === "A";
  const left = away ? { n: live.opposition, s: score.them } : { n: selfName, s: score.us };
  const right = away ? { n: selfName, s: score.us } : { n: live.opposition, s: score.them };
  const goals = sortedGoals(goalsOf(live)).reverse();
  const squadPlayers = players.filter(p => (live.squad || []).includes(p.id));
  // Anyone not ticked for today's squad is still offered as a scorer (a late arrival, or a tap missed at the start).
  const otherPlayers = players.filter(p => !(live.squad || []).includes(p.id));
  const running = !!live.run_since;
  const save = async patch => { try { await onUpdate(patch); } catch (e) { showToast("❌ Couldn't save that, check your signal"); } };

  const oppGoal = () => save({ goals: [...goalsOf(live), { id: newGoalId(), min: minuteOf(live), side: "them" }] });
  const saveSheet = () => {
    const s = sheet; if (!s) return;
    const rest = goalsOf(live).filter(g => g.id !== s.id);
    const g = { id: s.id || newGoalId(), min: Math.max(1, s.min), side: s.side };
    if (s.side === "us") { if (s.own) g.own = true; else if (s.name) { g.name = s.name; g.pid = s.pid; } }
    setSheet(null);
    // A scorer who wasn't in the squad is added to it, so they get their appearance when the match is saved.
    const squadNow = live.squad || [];
    const addToSquad = g.pid != null && !squadNow.includes(g.pid);
    save(addToSquad ? { goals: [...rest, g], squad: [...squadNow, g.pid] } : { goals: [...rest, g] });
  };
  const delGoal = () => { const id = sheet.id; setSheet(null); save({ goals: goalsOf(live).filter(g => g.id !== id) }); };
  const label = g => g.side === "them" ? "Opposition goal" : g.own ? "Own goal" : (g.name || "Goal");
  const finish = async () => {
    if (!window.confirm(`Finish the match at ${score.us}-${score.them} and save the result?`)) return;
    setBusy(true);
    try { await onEnd(); } catch (e) { showToast("❌ Couldn't save the result, try again"); }
    setBusy(false);
  };
  const stepBtn = { width: 44, height: 44, borderRadius: "50%", border: `1.5px solid ${T.ink30}`, background: L("#fff"), fontSize: 22, color: T.text, cursor: "pointer", fontFamily: "inherit" };

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: T.ink60, fontFamily: T.mono, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", padding: "0 0 12px" }}>‹ Back</button>
      {T.sports ? (
        <div style={{ textAlign: "center", marginBottom: 14, color: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, fontWeight: 600, color: T.ink60, marginBottom: 14 }}>
            <span>{live.competition}</span>
            {running ? <span style={{ background: "#ff453a22", color: "#ff453a", borderRadius: 99, padding: "5px 11px", fontWeight: 800, fontSize: 12, letterSpacing: 0.8, display: "flex", alignItems: "center", gap: 6 }}><span className="sp-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: "#ff453a" }} />LIVE</span> : <span style={{ fontWeight: 800, letterSpacing: 1 }}>PAUSED</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {[left, right].map((x, k) => {
              const ours = k === 0 ? !away : away;
              const el = (
                <div key={"s" + k} style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <SBadge src={ours ? badge : oppLogo} name={x.n} size={78} ours={ours} />
                  <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.15 }}>{x.n}</span>
                </div>
              );
              return k === 0 ? [el, <div key="sc" style={{ fontSize: 64, fontWeight: 800, letterSpacing: -3, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{left.s}<span style={{ color: T.sky, fontWeight: 300, margin: "0 6px" }}>–</span>{right.s}</div>] : el;
            })}
          </div>
          <div style={{ marginTop: 10, fontSize: 17, fontWeight: 700, color: T.sky, fontVariantNumeric: "tabular-nums" }}>{clockText(live, now)} · {PHASE_LABEL[live.phase] || ""}</div>
        </div>
      ) : (
      <div style={{ background: T.navy, borderRadius: 16, color: "#fff", padding: "16px 12px 14px", textAlign: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: T.mono, fontSize: 10, letterSpacing: 1, color: T.sky, marginBottom: 4 }}>
          <span>{live.competition}</span>
          {running ? <span style={{ background: "#e53935", color: "#fff", borderRadius: 99, padding: "3px 9px", fontWeight: 800 }}>● LIVE</span> : <span>PAUSED</span>}
        </div>
        <div style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 38, letterSpacing: 2 }}>{clockText(live, now)}</div>
        <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: 2, color: T.sky }}>{PHASE_LABEL[live.phase] || ""}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, margin: "10px 0 4px" }}>
          <span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 44, background: "#1c2344", padding: "2px 18px", borderRadius: 12, minWidth: 68 }}>{left.s}</span>
          <span style={{ color: "#6b7191", fontSize: 22, fontFamily: T.mono }}>–</span>
          <span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 44, background: "#1c2344", padding: "2px 18px", borderRadius: 12, minWidth: 68 }}>{right.s}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-around", fontFamily: T.display, fontWeight: 600, fontSize: 12, letterSpacing: 0.6, color: "#c6cbe0", textTransform: "uppercase" }}><span style={{ flex: 1 }}>{left.n}</span><span style={{ flex: 1 }}>{right.n}</span></div>
      </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={() => setSheet({ id: null, side: "us", min: minuteOf(live), name: null, own: false })} style={{ ...btn(T.sports ? T.sky : T.pitch, T.sports ? T.onSky : "#fff"), flex: 1, ...(T.sports ? { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 18, fontSize: 17, letterSpacing: 0, borderRadius: 16 } : {}) }}>{T.sports ? <><Icon name="ball" size={22} /> Leon goal</> : "⚽ GOAL"}</button>
        <button onClick={oppGoal} style={{ ...btn("#fff", T.ink60), flex: 1, fontSize: 12 }}>OPPOSITION GOAL</button>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
        {live.phase === "h1" && <button onClick={() => save(pauseForHalfTime(live))} style={{ ...btn("#fff", T.ink60), flex: 1 }}>⏸ HALF TIME</button>}
        {live.phase === "ht" && <button onClick={() => save(startSecondHalf())} style={{ ...btn(T.navy, T.sky), flex: 1 }}>▶ START 2ND HALF</button>}
        {live.phase === "h2" && !running && <button onClick={() => save({ run_since: Date.now() })} style={{ ...btn(T.navy, T.sky), flex: 1 }}>▶ RESUME</button>}
        <button onClick={finish} disabled={busy} style={{ ...btn("#fff", T.ink60, busy), flex: 1 }}>{busy ? "SAVING..." : "END MATCH"}</button>
      </div>

      <span style={lab}>Goals</span>
      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        {goals.length === 0 && <div style={{ padding: 16, textAlign: "center", fontSize: 13, color: T.ink60 }}>No goals yet.</div>}
        {goals.map(g => (
          <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderBottom: `1px solid ${L("#eef0f5")}`, color: g.side === "them" ? T.ink60 : T.text, fontWeight: 600, fontSize: 14 }}>
            {T.sports && <Icon name="ball" size={18} color={g.side === "them" ? T.ink60 : T.sky} />}<span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 13, background: g.side === "them" ? L("#e9ebf2") : T.navy, color: g.side === "them" ? T.ink60 : T.sky, borderRadius: 6, padding: "3px 7px", minWidth: 42, textAlign: "center" }}>{g.min}'</span>
            {label(g)}
            <button onClick={() => setSheet({ id: g.id, side: g.side, min: g.min, name: g.name || null, pid: g.pid, own: !!g.own })} style={{ marginLeft: "auto", background: "none", border: "none", color: T.skyInk, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>edit</button>
          </div>
        ))}
      </div>
      <button onClick={async () => { if (window.confirm("Cancel this match without saving anything?")) { try { await onDiscard(); } catch (e) { showToast("❌ Couldn't cancel it"); } } }} style={{ background: "none", border: "none", color: T.loss, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: "8px 0" }}>Cancel match (don't save)</button>

      {sheet && (
        <div className={T.sports ? "sp-fade" : undefined} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setSheet(null)}>
          <div className={T.sports ? "sp-sheet" : undefined} onClick={e => e.stopPropagation()} style={{ background: L("#fff"), borderRadius: "22px 22px 0 0", width: "100%", maxWidth: 520, maxHeight: "86vh", display: "flex", flexDirection: "column" }}>
            {/* The list scrolls; the buttons stay fixed at the bottom so Save is never pushed off the screen on a phone. */}
            {T.sports && <div style={{ width: 40, height: 5, borderRadius: 3, background: "#48484a", margin: "10px auto 0" }} />}
            <div style={{ overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "16px 16px 8px", flex: "1 1 auto", minHeight: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: 1, color: T.text, textAlign: "center" }}>{sheet.id ? "EDIT GOAL" : "GOAL"}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, margin: "8px 0 12px" }}>
                <button onClick={() => setSheet(s => ({ ...s, min: Math.max(1, s.min - 1) }))} style={stepBtn}>−</button>
                <span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 36, color: T.text, minWidth: 80, textAlign: "center" }}>{sheet.min}'</span>
                <button onClick={() => setSheet(s => ({ ...s, min: s.min + 1 }))} style={stepBtn}>+</button>
              </div>
              {sheet.side === "us" && (() => {
                const chip = (on) => ({ padding: "12px 6px", borderRadius: 10, border: `1.5px solid ${on ? T.navy : T.ink30}`, background: on ? T.navy : L("#fff"), color: on ? T.sky : T.text, fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer" });
                const playerBtn = p => { const on = !sheet.own && sheet.name === p.name; return (
                  <button key={p.id} onClick={() => setSheet(s => ({ ...s, name: p.name, pid: p.id, own: false }))} style={chip(on)}>{p.name}</button>
                ); };
                return (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {squadPlayers.map(playerBtn)}
                      <button onClick={() => setSheet(s => ({ ...s, own: true, name: null, pid: undefined }))} style={chip(sheet.own)}>Own goal</button>
                      <button onClick={() => setSheet(s => ({ ...s, own: false, name: null, pid: undefined }))} style={chip(!sheet.own && !sheet.name)}>Not sure</button>
                    </div>
                    {otherPlayers.length > 0 && (
                      <>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: T.ink60, textTransform: "uppercase", margin: "14px 0 6px" }}>Not in today's squad</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>{otherPlayers.map(playerBtn)}</div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>
            <div style={{ padding: "8px 16px calc(14px + env(safe-area-inset-bottom, 0px))", borderTop: `1px solid ${T.ink30}`, flex: "0 0 auto" }}>
              <button onClick={saveSheet} style={btn(T.navy, T.sky)}>SAVE GOAL</button>
              {sheet.id && <button onClick={delGoal} style={{ ...btn("#fff", T.loss), marginTop: 8 }}>DELETE THIS GOAL</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// The red LIVE card on the Home screen. Anyone can see it; admins can tap it to open the scoring controls.
export function LiveCard({ T, live, selfName, badge, oppLogo, onOpen }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(n => n + 1), 1000); return () => clearInterval(t); }, []);
  const score = scoreOf(live), away = live.home_away === "A";
  const left = away ? { n: live.opposition, s: score.them } : { n: selfName, s: score.us };
  const right = away ? { n: selfName, s: score.us } : { n: live.opposition, s: score.them };
  const last = sortedGoals(goalsOf(live)).filter(g => g.side === "us" && g.name).pop();
  const running = !!live.run_since;
  const Tag = onOpen ? "button" : "div";
  if (T.sports) {
    const side = (x, ours) => (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 0 }}>
        <SBadge src={ours ? badge : oppLogo} name={x.n} size={54} ours={ours} />
        <span style={{ fontSize: 13, fontWeight: 700, textAlign: "center", lineHeight: 1.15 }}>{x.n}</span>
      </div>
    );
    return (
      <Tag onClick={onOpen} style={{ display: "block", boxSizing: "border-box", width: "100%", border: "none", textAlign: "center", cursor: onOpen ? "pointer" : "default", background: `linear-gradient(160deg, ${T.navySoft}, ${T.white} 70%)`, borderRadius: 24, padding: "14px 16px 16px", color: "#fff", marginBottom: 18, fontFamily: T.body }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, fontWeight: 700 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: running ? "#ff453a" : T.ink60, letterSpacing: 0.8 }}><span className={running ? "sp-pulse" : undefined} style={{ width: 8, height: 8, borderRadius: "50%", background: running ? "#ff453a" : T.ink60 }} />{running ? "LIVE" : (PHASE_LABEL[live.phase] || "PAUSED").toUpperCase()}</span>
          <span style={{ color: T.sky }}>{live.competition} · {clockText(live)}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14 }}>
          {side(left, !away)}
          <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: -2, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{left.s}<span style={{ color: T.sky, fontWeight: 300, margin: "0 6px" }}>–</span>{right.s}</div>
          {side(right, away)}
        </div>
        {last && <div style={{ fontSize: 13, color: "#aeaeb2", marginTop: 12 }}>⚽ {last.name} {last.min}'</div>}
        {onOpen && <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: T.sky, marginTop: 8 }}>Tap to score</div>}
      </Tag>
    );
  }
  return (
    <Tag onClick={onOpen} style={{ display: "block", boxSizing: "border-box", width: "100%", border: "none", textAlign: "center", cursor: onOpen ? "pointer" : "default", background: T.navy, borderRadius: 14, padding: 14, color: "#fff", marginBottom: 24, fontFamily: "inherit" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: T.mono, fontSize: 10, letterSpacing: 1, color: T.sky }}>
        <span style={{ background: running ? "#e53935" : "#6b7191", color: "#fff", borderRadius: 99, padding: "3px 9px", fontWeight: 800 }}>● {running ? "LIVE" : (PHASE_LABEL[live.phase] || "PAUSED")}</span>
        <span>{live.competition} · {clockText(live)}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", marginTop: 10 }}>
        <div style={{ flex: 1 }}><div style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 30, background: "#1c2344", display: "inline-block", padding: "2px 14px", borderRadius: 8 }}>{left.s}</div><div style={{ fontFamily: T.display, fontWeight: 600, fontSize: 11, color: "#c6cbe0", marginTop: 6, textTransform: "uppercase" }}>{left.n}</div></div>
        <span style={{ color: "#6b7191", fontFamily: T.mono }}>–</span>
        <div style={{ flex: 1 }}><div style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 30, background: "#1c2344", display: "inline-block", padding: "2px 14px", borderRadius: 8 }}>{right.s}</div><div style={{ fontFamily: T.display, fontWeight: 600, fontSize: 11, color: "#c6cbe0", marginTop: 6, textTransform: "uppercase" }}>{right.n}</div></div>
      </div>
      {last && <div style={{ fontSize: 12, color: "#c6cbe0", marginTop: 10 }}>⚽ {last.name} {last.min}'</div>}
      {onOpen && <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: 1.5, color: T.sky, marginTop: 8 }}>TAP TO SCORE</div>}
    </Tag>
  );
}
