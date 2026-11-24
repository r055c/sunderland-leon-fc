// Square (1080x1080) dark result card used when a result is shared (WhatsApp etc.).
// Drawn with plain inline styles so html2canvas can export it. Colours come from the club's own palette.
import React from "react";
import { Badge } from "./Poster.jsx";
import { mix } from "./branding.js";

const SANS = "-apple-system, 'SF Pro Display', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const up = (s) => String(s || "").toUpperCase();

// Turns the stored scorers / goal times into display rows: [{ who, mins, them }]
function goalRows(match) {
  const times = Array.isArray(match.goal_times) ? match.goal_times : [];
  if (times.length) {
    const byWho = new Map();
    times.forEach((g) => {
      const them = g.side === "them";
      const who = them ? (match.opposition || "Opposition") : (g.name || "Goal");
      const key = (them ? "t|" : "u|") + who;
      if (!byWho.has(key)) byWho.set(key, { who, mins: [], them });
      if (g.min != null && g.min !== "") byWho.get(key).mins.push(`${g.min}’`);
    });
    return [...byWho.values()].filter((r) => !r.them || true);
  }
  return (match.scorers || []).map((s) => ({ who: String(s).replace(/\s*[×x]\d+$/, "").trim() + (/[×x]\d+$/.test(s) ? ` ${String(s).match(/[×x]\d+$/)[0].replace("x", "×")}` : ""), mins: [], them: false }));
}

export function ShareCardB({ match, club, short: shortName, label, crest, oppLogo, colors, compLabel }) {
  const c = colors;
  const short = String(shortName || club || "").replace(/ FC$/i, "");
  const opp = String(match.opposition || "Opposition").replace(/\s+(U\d+.*)$/i, "");
  const rows = goalRows(match);
  const many = rows.length > 6;
  const pens = match.homePens != null && match.awayPens != null;
  const head = [match.result === "W" ? "FULL TIME" : match.result === "L" ? "FULL TIME" : "FULL TIME", compLabel].filter(Boolean).map(up).join(" · ");
  const scoreSize = String(match.homeScore).length + String(match.awayScore).length > 3 ? 150 : 190;
  const nameSize = (s) => (s.length <= 12 ? 40 : s.length <= 18 ? 34 : 28);
  return (
    <div style={{ width: 1080, height: 1080, boxSizing: "border-box", position: "relative", overflow: "hidden", color: "#fff", fontFamily: SANS, padding: "64px 72px 52px", display: "flex", flexDirection: "column", background: `radial-gradient(1000px 640px at 85% -8%, ${mix(c.accent, c.bg, 0.72)} 0%, ${c.bg} 68%)` }}>
      <div style={{ textAlign: "center", fontWeight: 700, fontSize: 28, letterSpacing: 5, color: c.accent }}>{head}</div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ width: 280, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <Badge src={/^data:image\/svg|\.svg(\?|$)/i.test(crest || "") ? null : crest} name={short} size={210} c={c} />
          <div style={{ fontWeight: 700, fontSize: nameSize(short), textAlign: "center", lineHeight: 1.1 }}>{short}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", fontWeight: 800, fontSize: scoreSize, letterSpacing: -8, lineHeight: 1 }}>
          <span>{match.homeScore}</span><span style={{ color: c.accent, fontWeight: 300, margin: "0 14px" }}>–</span><span>{match.awayScore}</span>
        </div>
        <div style={{ width: 280, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <Badge src={/^data:image\/svg|\.svg(\?|$)/i.test(oppLogo || "") ? null : oppLogo} name={opp} size={210} c={c} />
          <div style={{ fontWeight: 700, fontSize: nameSize(opp), textAlign: "center", lineHeight: 1.1 }}>{opp}</div>
        </div>
      </div>
      {pens ? <div style={{ textAlign: "center", marginTop: 14, fontWeight: 700, fontSize: 30, color: c.accent }}>({match.homePens}–{match.awayPens} on penalties)</div> : null}
      {rows.length > 0 && (
        <div style={{ background: "#1c1c1e", borderRadius: 30, padding: "18px 34px", marginTop: pens ? 20 : 34, display: "flex", flexDirection: "column", justifyContent: "center", flexShrink: 0 }}>
          {many ? (
            <div style={{ fontSize: 28, lineHeight: 1.5, color: "#aeaeb2" }}>⚽ {rows.map((r, i) => (<span key={i}>{i ? " · " : ""}<b style={{ color: r.them ? "#8e8e93" : "#fff" }}>{r.who}</b>{r.mins.length ? ` ${r.mins.join(" ")}` : ""}</span>))}</div>
          ) : rows.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 18, fontSize: rows.length > 4 ? 30 : 36, padding: rows.length > 4 ? "7px 0" : "10px 0", color: "#aeaeb2" }}>
              <span style={{ opacity: r.them ? 0.45 : 1 }}>⚽</span>
              <b style={{ color: r.them ? "#8e8e93" : "#fff", fontWeight: 700 }}>{r.who}</b>
              <span style={{ marginLeft: "auto" }}>{r.mins.join(" · ")}</span>
            </div>
          ))}
        </div>
      )}
      {match.motm ? (
        <div style={{ background: c.accent, color: c.accentInk, borderRadius: 26, padding: "20px 34px", marginTop: 18, fontSize: 32, fontWeight: 600, flexShrink: 0 }}>★ Player of the match · <b style={{ fontWeight: 800 }}>{match.motm}</b></div>
      ) : null}
      </div>
      <div style={{ paddingTop: 20, display: "flex", justifyContent: "space-between", fontSize: 22, letterSpacing: 3, fontWeight: 700, color: "#636366" }}>
        <span>{up(club)}{label ? ` · ${up(label)}` : ""}</span><span>{up(match.date)}</span>
      </div>
    </div>
  );
}
