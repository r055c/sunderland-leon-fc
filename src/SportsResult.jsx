// "Full time" view of a result in the Sports look: big badges, goal timeline, player of the match.
import React from "react";
import { SBadge, Icon } from "./sportsUI.jsx";

export function SportsResultView({ match, T, brand, oppLogo, teamName, players = [], onOpenPlayer }) {
  const us = brand.short || String(brand.name || "").replace(/ FC$/i, "");
  const times = [...(match.goal_times || [])].sort((a, b) => (+a.min || 0) - (+b.min || 0));
  const scorers = match.scorers || [];
  const hasPens = match.homePens != null && match.awayPens != null && match.homePens !== "" && match.awayPens !== "";
  const side = (badge, name) => (
    <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      {badge}
      <span style={{ fontSize: 14, fontWeight: 700, textAlign: "center", lineHeight: 1.15 }}>{name}</span>
    </div>
  );
  const photoOf = (n) => players.find((p) => p.name === n)?.photo;
  const person = (n, c) => (photoOf(n)
    ? <img src={photoOf(n)} alt="" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", border: `2px solid ${c}` }} />
    : <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#00000022", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13 }}>{String(n).slice(0, 2).toUpperCase()}</div>);
  return (
    <div style={{ background: T.white, borderRadius: 26, padding: "18px 16px 18px", maxWidth: 520, margin: "0 auto", fontFamily: T.body, color: "#fff" }}>
      <div style={{ textAlign: "center", fontSize: 13, fontWeight: 600, color: T.ink60 }}>{match.competition}{match.round ? ` · ${match.round}` : ""} · {match.date}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, margin: "18px 0 6px" }}>
        {side(<SBadge src={brand.badge} name={us} size={76} ours />, us)}
        <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -3, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{match.homeScore}<span style={{ color: T.sky, fontWeight: 300, margin: "0 6px" }}>–</span>{match.awayScore}</div>
        {side(<SBadge src={oppLogo} name={match.opposition} size={76} />, match.opposition)}
      </div>
      <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, letterSpacing: 2, color: T.ink60 }}>FULL TIME{hasPens ? ` · ${match.homePens}–${match.awayPens} ON PENS` : ""}</div>

      {(times.length > 0 || scorers.length > 0) && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink60, textTransform: "uppercase", letterSpacing: 0.6, margin: "22px 4px 8px" }}>Goals</div>
          <div style={{ background: "#000000", borderRadius: 18, padding: "4px 14px" }}>
            {times.length > 0 ? times.map((g, i) => {
              const them = g.side === "them", name = g.name || (them ? match.opposition : "Goal");
              return (
                <div key={i} onClick={() => !them && g.name && onOpenPlayer && onOpenPlayer(g.name)} style={{ display: "grid", gridTemplateColumns: "1fr 48px 1fr", alignItems: "center", padding: "11px 0", borderBottom: i === times.length - 1 ? "none" : `1px solid ${T.ink30}`, fontSize: 15, fontWeight: 600, cursor: !them && onOpenPlayer ? "pointer" : "default" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>{!them ? <><Icon name="ball" size={16} color={T.sky} />{name}</> : null}</span>
                  <b style={{ textAlign: "center", color: T.sky, fontSize: 13 }}>{g.min != null && g.min !== "" ? `${g.min}’` : "·"}</b>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end", color: T.ink60 }}>{them ? <>{name}<Icon name="ball" size={16} color={T.ink60} /></> : null}</span>
                </div>
              );
            }) : scorers.map((s, i) => {
              const nm = s.replace(/\s*[×x]\d+$/, "").trim();
              return (
                <div key={i} onClick={() => onOpenPlayer && onOpenPlayer(nm)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderBottom: i === scorers.length - 1 ? "none" : `1px solid ${T.ink30}`, fontSize: 15, fontWeight: 600, cursor: onOpenPlayer ? "pointer" : "default" }}>
                  <Icon name="ball" size={16} color={T.sky} />{player(players, nm) ? `#${player(players, nm)} ` : ""}{s}
                </div>
              );
            })}
          </div>
        </>
      )}

      {match.motm && (
        <div onClick={() => onOpenPlayer && onOpenPlayer(match.motm)} style={{ display: "flex", alignItems: "center", gap: 12, background: T.sky, color: T.onSky, borderRadius: 18, padding: "12px 16px", marginTop: 14, cursor: onOpenPlayer ? "pointer" : "default" }}>
          {photoOf(match.motm) ? person(match.motm, T.onSky) : <Icon name="star" size={24} filled color={T.onSky} />}
          <div><div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, opacity: 0.8 }}>PLAYER OF THE MATCH</div><div style={{ fontSize: 18, fontWeight: 800 }}>{match.motm}</div></div>
        </div>
      )}
      {match.oppMotm && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: T.ink60, padding: "12px 4px 0", fontSize: 14, fontWeight: 600 }}>
          <Icon name="star" size={18} color={T.ink60} /> {match.opposition} player of the match: <span style={{ color: "#aeaeb2" }}>{match.oppMotm}</span>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, fontSize: 11, letterSpacing: 1.5, fontWeight: 700, color: "#636366" }}>
        <span>{String(brand.name || "").toUpperCase()}{teamName ? ` · ${String(teamName).toUpperCase()}` : ""}</span>
      </div>
    </div>
  );
}
const player = (players, n) => players.find((p) => p.name === n)?.squad_number;
