// Fixtures poster: four 1080x1350 (4:5) layouts, drawn with plain inline styles so html2canvas can export them.
// Nothing club-specific is hard-coded: names, crest, colours, label and motto all arrive through `d`.
import React, { useState, useEffect } from "react";
import { mix, contrast } from "./branding.js";

export const POSTER_W = 1080, POSTER_H = 1350;
// kind "month" = a whole month of games; "single" = just the next fixture.
export const POSTER_LAYOUTS = [
  { id: "grid", kind: "month", name: "Weekend grid", desc: "Opposition badges across the top, centred list" },
  { id: "table", kind: "month", name: "Fixtures table", desc: "Date headers and striped rows" },
  { id: "next", kind: "month", name: "Next up + coming up", desc: "Next game in a big card, the rest below" },
  { id: "tickets", kind: "month", name: "Matchday tickets", desc: "One ticket per game" },
  { id: "pill", kind: "single", name: "Match pill", desc: "Next fixture, white panel between the two sides" },
  { id: "single", kind: "single", name: "Next fixture card", desc: "Next fixture, big date and badges" },
];
const COND = "'Barlow Condensed', 'Arial Narrow', sans-serif";
const BODY = "'Barlow', system-ui, sans-serif";

// Palette from the club's two brand colours.
export function posterColors(primary, accent) {
  const bg = mix(primary, "#000000", 0.4);
  const card = mix(primary, "#ffffff", 0.14);
  const accentInk = contrast(accent, bg) >= 4.5 ? bg : "#000000";
  const muted = mix("#ffffff", bg, 0.3);
  return { bg, bg2: mix(primary, "#000000", 0.2), card, rule: mix(primary, "#ffffff", 0.22), accent, accentInk, muted, ticketInk: bg, ticketSub: mix(bg, "#ffffff", 0.35), ticketAccent: mix(accent, "#000000", 0.35) };
}

// Match a fixture's opposition to a team (for its badge). Names rarely match exactly ("Hebburn Town (Juniors) U10 Gold" vs "Hebburn Town FC Juniors Gold"), so compare the meaningful words.
const STOP = new Set(["fc", "afc", "cfc", "the", "junior", "juniors", "youth", "boys", "u6", "u7", "u8", "u9", "u10", "u11", "u12", "u13", "u14", "u15", "u16", "u17", "u18", "jfc"]);
const words = (s) => String(s || "").toLowerCase().replace(/&/g, " ").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w));
export function findTeamLogo(teams, name) {
  const w = words(name);
  if (!w.length) return null;
  let best = null, bestScore = 0;
  for (const t of teams || []) {
    if (!t.logo) continue;
    const tw = words(t.name);
    if (!tw.length) continue;
    const shared = tw.filter((x) => w.includes(x)).length;
    const score = shared / Math.max(tw.length, w.length);
    if (shared >= 1 && score > bestScore) { best = t; bestScore = score; }
  }
  return bestScore >= 0.6 ? best.logo : null;
}

const initials = (name) => words(name).slice(0, 2).map((x) => x[0]).join("").toUpperCase() || "?";
const upper = (s) => String(s || "").toUpperCase();
// Split "Hebburn Town (Juniors) U10 Gold" into the club name and its age/team ("U10 GOLD").
export function oppParts(name) {
  const s = String(name || "").replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  const m = /\b(u\d{1,2})\b(?:\s+([a-z]+))?\s*$/i.exec(s);
  if (!m) return { name: s || String(name || ""), sub: "" };
  const base = s.slice(0, m.index).replace(/\b(juniors?|youth|jfc)\s*$/i, "").trim();
  return { name: base || s, sub: [m[1], m[2]].filter(Boolean).join(" ").toUpperCase() };
}
const dayName = (d) => d.toLocaleDateString("en-GB", { weekday: "long" }).toUpperCase();
const monthName = (d) => d.toLocaleDateString("en-GB", { month: "long" }).toUpperCase();

// Badge files saved with an off-white or tinted background show as a box inside the circle,
// so the circle takes the colour of the image's corner when that corner is solid.
function cornerColour(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image(); img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const w = Math.min(img.naturalWidth || 64, 256), h = Math.min(img.naturalHeight || 64, 256);
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        const x = c.getContext("2d"); x.drawImage(img, 0, 0, w, h);
        const at = (px, py) => Array.from(x.getImageData(px, py, 1, 1).data);
        const pts = [at(1, 1), at(w - 2, 1), at(1, h - 2), at(w - 2, h - 2)];
        if (pts.some((p) => p[3] < 200)) return resolve(null);               // transparent corners: keep white
        const [r, g, b] = pts[0];
        if (pts.some((p) => Math.abs(p[0] - r) + Math.abs(p[1] - g) + Math.abs(p[2] - b) > 24)) return resolve(null); // corners differ
        resolve(`rgb(${r},${g},${b})`);
      } catch (e) { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
function Badge({ src, name, size, c, ring }) {
  const [bg, setBg] = useState(null);
  useEffect(() => { let on = true; setBg(null); cornerColour(src).then((v) => { if (on) setBg(v); }); return () => { on = false; }; }, [src]);
  return (
    <div style={{ width: size, height: size, borderRadius: size / 2, background: bg || "#ffffff", border: ring ? `3px solid ${c.accent}` : "none", boxSizing: "border-box", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {src ? <img src={src} alt="" style={{ width: "72%", height: "72%", objectFit: "contain" }} />
        : <div style={{ fontFamily: COND, fontWeight: 800, fontSize: size * 0.4, color: "#0b1320" }}>{initials(name)}</div>}
    </div>
  );
}
function Crest({ d, size }) {
  const c = d.colors;
  // SVG crests can't be drawn into the exported image, so those fall back to initials.
  const ok = d.crest && !/^data:image\/svg|\.svg(\?|$)/i.test(d.crest);
  return ok
    ? <img src={d.crest} alt="" style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }} />
    : <div style={{ width: size, height: size, borderRadius: size / 2, background: c.accent, color: c.accentInk, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: COND, fontWeight: 800, fontSize: size * 0.4, flexShrink: 0 }}>{initials(d.club)}</div>;
}

// Scale sizes down when a month has many games.
const kFor = (n) => (n <= 4 ? 1 : n === 5 ? 0.9 : n === 6 ? 0.8 : 0.7);
// Long opposition names get a smaller font.
const nameSize = (txt, base) => (txt.length <= 15 ? base : txt.length <= 22 ? base * 0.84 : base * 0.7);

// The two sides of a fixture, home team first.
function sides(f, d) {
  const us = { name: upper(d.club), sub: upper(d.label), logo: d.crest, ours: true };
  const p = oppParts(f.opp);
  const them = { name: upper(p.name), sub: p.sub, logo: f.logo, ours: false };
  return f.ha === "A" ? [them, us] : [us, them];
}

// The league's logo on a white chip (logo files usually have a white background).
const svgSrc = (u) => /^data:image\/svg|\.svg(\?|$)/i.test(u || "");
function LeagueChip({ d, h }) {
  if (!d.leagueLogo || svgSrc(d.leagueLogo)) return null;
  return <div style={{ background: "#ffffff", borderRadius: 16, padding: 8, display: "flex", flexShrink: 0 }}><img src={d.leagueLogo} alt="" style={{ height: h, width: "auto", display: "block" }} /></div>;
}

// Rough "main colour" of a badge, used to tint the opposition's side of the pill poster.
function dominantColour(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image(); img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas"); c.width = c.height = 32;
        const x = c.getContext("2d"); x.drawImage(img, 0, 0, 32, 32);
        const px = x.getImageData(0, 0, 32, 32).data, buckets = {};
        for (let i = 0; i < px.length; i += 4) {
          const [r, g, b, a] = [px[i], px[i + 1], px[i + 2], px[i + 3]];
          if (a < 200) continue;
          const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
          if (mx > 235 && mn > 215) continue; // white
          if (mx < 40) continue;              // black outline
          if (mx - mn < 28) continue;         // grey
          const k = [r, g, b].map((v) => Math.round(v / 48) * 48).join(",");
          (buckets[k] = buckets[k] || { n: 0, r: 0, g: 0, b: 0 }); const o = buckets[k]; o.n++; o.r += r; o.g += g; o.b += b;
        }
        const best = Object.values(buckets).sort((p, q) => q.n - p.n)[0];
        if (!best || best.n < 12) return resolve(null);
        const h = (v) => Math.round(v / best.n).toString(16).padStart(2, "0");
        resolve("#" + h(best.r) + h(best.g) + h(best.b));
      } catch (e) { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
function useColour(src) {
  const [c, setC] = useState(null);
  useEffect(() => { let on = true; dominantColour(src).then((v) => { if (on) setC(v); }); return () => { on = false; }; }, [src]);
  return c;
}

// Crest + club name/team on the left, month and year on the right (shared by the "next" posters).
function Head({ d, comp }) {
  const c = d.colors;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <Crest d={d} size={110} />
        <div>
          <div style={{ fontFamily: COND, fontWeight: 800, fontSize: 64, lineHeight: 1 }}>{upper(d.club)}</div>
          {(d.label || comp) ? <div style={{ fontFamily: COND, fontWeight: 700, fontSize: 26, letterSpacing: 4, color: c.accent }}>{[upper(d.label), upper(comp)].filter(Boolean).join(" · ")}</div> : null}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <LeagueChip d={d} h={84} />
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: COND, fontWeight: 800, fontSize: 64, lineHeight: 1 }}>{upper(d.monthName)}</div>
          <div style={{ fontFamily: COND, fontWeight: 700, fontSize: 26, letterSpacing: 4, color: c.accent }}>{d.year}</div>
        </div>
      </div>
    </div>
  );
}

const Footer = ({ d, color }) => (
  d.motto ? <div style={{ display: "flex", justifyContent: "flex-end", fontFamily: COND, fontWeight: 600, fontSize: 24, letterSpacing: 5, color: color || d.colors.muted }}>{upper(d.motto)}</div> : null
);
const Sub = ({ d }) => (
  <div style={{ fontFamily: COND, fontWeight: 700, fontSize: 30, letterSpacing: 5, color: d.colors.accent, whiteSpace: "nowrap" }}>{upper(d.monthLabel)}{d.label ? ` · ${upper(d.club)} ${upper(d.label)}` : ` · ${upper(d.club)}`}</div>
);

// ── 3: matchday tickets ──
function TicketPoster({ d }) {
  const c = d.colors, k = kFor(d.fixtures.length);
  return (
    <div style={{ width: POSTER_W, height: POSTER_H, boxSizing: "border-box", background: c.bg2, color: "#fff", fontFamily: BODY, padding: "64px 64px 48px", display: "flex", flexDirection: "column", gap: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: COND, fontWeight: 800, fontSize: 170, lineHeight: 0.88, letterSpacing: 1 }}>MATCHDAY</h1>
          <div style={{ marginTop: 10 }}><Sub d={d} /></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}><LeagueChip d={d} h={90} /><Crest d={d} size={130} /></div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, flexGrow: 1, minHeight: 0 }}>
        {d.fixtures.map((f, i) => {
          const [L, R] = sides(f, d);
          const title = `${L.name} V ${R.name}`;
          const [a, b] = [L.name, R.name];
          return (
            <div key={i} style={{ display: "flex", flex: "1 1 0", minHeight: 0, maxHeight: 280 }}>
              <div style={{ flexGrow: 1, background: "#ffffff", color: c.ticketInk, borderRadius: "22px 0 0 22px", display: "flex", alignItems: "center", gap: 26, padding: "0 32px", minWidth: 0 }}>
                <Badge src={f.logo} name={f.opp} size={100 * k} c={c} ring />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: COND, fontWeight: 700, fontSize: 24 * k + 2, letterSpacing: 3, color: c.ticketSub }}>{upper(f.compLabel)}{f.ha ? ` · ${f.ha === "A" ? "AWAY" : "HOME"}` : ""}</div>
                  <div style={{ fontFamily: COND, fontWeight: 800, fontSize: nameSize(title, 52 * k), lineHeight: 1.05 }}>{a} <span style={{ color: c.ticketAccent }}>V</span> {b}</div>
                  <div style={{ fontFamily: COND, fontWeight: 700, fontSize: 28 * k, letterSpacing: 3, color: c.ticketAccent }}>KICK-OFF {f.time || "TBC"}{f.venue ? ` · ${upper(f.venue)}` : ""}</div>
                </div>
              </div>
              <div style={{ width: 210, background: c.accent, color: c.accentInk, borderRadius: "0 22px 22px 0", borderLeft: `3px dashed ${c.ticketSub}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <div style={{ fontFamily: COND, fontWeight: 700, fontSize: 30 * k + 2, letterSpacing: 4 }}>{dayName(f.date).slice(0, 3)}</div>
                <div style={{ fontFamily: COND, fontWeight: 800, fontSize: 96 * k, lineHeight: 0.9 }}>{String(f.date.getDate()).padStart(2, "0")}</div>
                <div style={{ fontFamily: COND, fontWeight: 700, fontSize: 30 * k + 2, letterSpacing: 4 }}>{monthName(f.date).slice(0, 3)}</div>
              </div>
            </div>
          );
        })}
      </div>
      <Footer d={d} />
    </div>
  );
}

// ── 2: next up ──
function NextPoster({ d }) {
  const c = d.colors;
  const [first, ...rest] = d.fixtures;
  const k = kFor(rest.length + 1);
  const [L, R] = first ? sides(first, d) : [null, null];
  const home = first ? first.ha !== "A" : true;
  const side = (s) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: 330 }}>
      {s.ours ? <Crest d={d} size={230} /> : <Badge src={s.logo} name={first.opp} size={230} c={c} />}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: COND, fontWeight: 800, fontSize: nameSize(s.name, 52), lineHeight: 1 }}>{s.name}</div>
        {s.sub ? <div style={{ fontFamily: COND, fontWeight: 600, fontSize: 26, letterSpacing: 4, color: c.accent, marginTop: 4 }}>{s.sub}</div> : null}
      </div>
    </div>
  );
  return (
    <div style={{ width: POSTER_W, height: POSTER_H, boxSizing: "border-box", background: c.bg, color: "#fff", fontFamily: BODY, padding: "64px 64px 48px", display: "flex", flexDirection: "column", gap: 28 }}>
      <Head d={d} comp={d.comp} />
      {first && (
        <div style={{ background: mix(c.card, c.accent, 0.12), borderRadius: 28, padding: "36px 40px", display: "flex", flexDirection: "column", gap: 20, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, left: 440, width: 150, height: 700, background: `${c.accent}1a`, transform: "rotate(25deg)" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
            <div style={{ background: c.accent, color: c.accentInk, borderRadius: 8, padding: "8px 20px", fontFamily: COND, fontWeight: 800, fontSize: 28, letterSpacing: 5 }}>NEXT UP</div>
            <div style={{ fontFamily: COND, fontWeight: 700, fontSize: 34, letterSpacing: 3 }}>{dayName(first.date).slice(0, 3)} {first.date.getDate()} {monthName(first.date).slice(0, 3)} · KO {first.time || "TBC"}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", padding: "4px 10px" }}>
            {side(L)}
            <div style={{ fontFamily: COND, fontWeight: 800, fontStyle: "italic", fontSize: 84, color: c.accent }}>VS</div>
            {side(R)}
          </div>
          <div style={{ textAlign: "center", fontFamily: COND, fontWeight: 600, fontSize: 24, letterSpacing: 5, color: c.muted, position: "relative" }}>{first.ha ? (home ? "HOME" : "AWAY") : upper(first.compLabel)}</div>
        </div>
      )}
      {rest.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ fontFamily: COND, fontWeight: 700, fontSize: 30, letterSpacing: 6, color: c.accent, whiteSpace: "nowrap" }}>COMING UP</div>
            <div style={{ height: 2, background: c.rule, flexGrow: 1 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, flexGrow: 1, minHeight: 0 }}>
            {rest.map((f, i) => (
              <div key={i} style={{ display: "flex", background: c.card, borderRadius: 18, overflow: "hidden", flex: "1 1 0", minHeight: 0, maxHeight: 190 }}>
                <div style={{ width: 130, background: c.accent, color: c.accentInk, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <div style={{ fontFamily: COND, fontWeight: 700, fontSize: 24, letterSpacing: 3 }}>{dayName(f.date).slice(0, 3)}</div>
                  <div style={{ fontFamily: COND, fontWeight: 800, fontSize: 64 * k, lineHeight: 0.95 }}>{f.date.getDate()}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 22, padding: "0 32px 0 24px", flexGrow: 1, minWidth: 0 }}>
                  <Badge src={f.logo} name={f.opp} size={76 * k} c={c} />
                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: COND, fontWeight: 800, fontSize: nameSize(upper(oppParts(f.opp).name), 44 * k), lineHeight: 1 }}>{upper(oppParts(f.opp).name)}</div>
                    <div style={{ fontFamily: COND, fontWeight: 600, fontSize: 22, letterSpacing: 3, color: c.muted }}>{[oppParts(f.opp).sub || upper(f.compLabel), f.ha ? (f.ha === "A" ? "AWAY" : "HOME") : "", upper(f.venue || "")].filter(Boolean).join(" · ")}</div>
                  </div>
                  <div style={{ fontFamily: COND, fontWeight: 800, fontSize: 54 * k }}>{f.time || "TBC"}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <div style={{ flexGrow: rest.length ? 0 : 1 }} />
      <Footer d={d} />
    </div>
  );
}

// ── single: just the next fixture ──
function SinglePoster({ d }) {
  const c = d.colors, f = d.fixtures[0];
  if (!f) return <div style={{ width: POSTER_W, height: POSTER_H, background: c.bg }} />;
  const [L, R] = sides(f, d);
  const side = (s) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, width: 400 }}>
      {s.ours ? <Crest d={d} size={300} /> : <Badge src={s.logo} name={f.opp} size={300} c={c} />}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: COND, fontWeight: 800, fontSize: nameSize(s.name, 66), lineHeight: 1 }}>{s.name}</div>
        {s.sub ? <div style={{ fontFamily: COND, fontWeight: 600, fontSize: 30, letterSpacing: 5, color: c.accent, marginTop: 6 }}>{s.sub}</div> : null}
      </div>
    </div>
  );
  return (
    <div style={{ width: POSTER_W, height: POSTER_H, boxSizing: "border-box", background: c.bg, color: "#fff", fontFamily: BODY, padding: "64px 64px 48px", display: "flex", flexDirection: "column", gap: 28 }}>
      <Head d={d} comp={f.compLabel} />
      <div style={{ flexGrow: 1, background: mix(c.card, c.accent, 0.12), borderRadius: 28, padding: "44px 40px", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden", minHeight: 0 }}>
        <div style={{ position: "absolute", top: -40, left: 460, width: 170, height: 1300, background: `${c.accent}1a`, transform: "rotate(25deg)" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
          <div style={{ background: c.accent, color: c.accentInk, borderRadius: 8, padding: "8px 22px", fontFamily: COND, fontWeight: 800, fontSize: 32, letterSpacing: 6 }}>NEXT UP</div>
          <div style={{ fontFamily: COND, fontWeight: 700, fontSize: 32, letterSpacing: 5, color: c.muted }}>{f.ha ? (f.ha === "A" ? "AWAY" : "HOME") : upper(f.compLabel)}</div>
        </div>
        <div style={{ textAlign: "center", position: "relative" }}>
          <div style={{ fontFamily: COND, fontWeight: 700, fontSize: 42, letterSpacing: 8, color: c.accent }}>{dayName(f.date)}</div>
          <div style={{ fontFamily: COND, fontWeight: 800, fontSize: 128, lineHeight: 0.95, whiteSpace: "nowrap" }}>{f.date.getDate()} {monthName(f.date)}</div>
          <div style={{ fontFamily: COND, fontWeight: 700, fontSize: 56, letterSpacing: 5, marginTop: 6 }}>KICK-OFF {f.time || "TBC"}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
          {side(L)}
          <div style={{ fontFamily: COND, fontWeight: 800, fontStyle: "italic", fontSize: 96, color: c.accent }}>VS</div>
          {side(R)}
        </div>
        <div style={{ textAlign: "center", fontFamily: COND, fontWeight: 600, fontSize: 28, letterSpacing: 5, color: c.muted, position: "relative", minHeight: 34 }}>{upper(f.venue || "")}</div>
      </div>
      <Footer d={d} />
    </div>
  );
}

// ── grid: opposition badges across the top, centred "Home v Away" list ──
function GridPoster({ d }) {
  const c = d.colors, n = d.fixtures.length, k = kFor(n);
  const seen = new Set(), badges = [];
  d.fixtures.forEach((f) => { const key = f.opp; if (!seen.has(key)) { seen.add(key); badges.push(f); } });
  const bs = badges.length + 1 > 5 ? 150 : 190;
  return (
    <div style={{ width: POSTER_W, height: POSTER_H, boxSizing: "border-box", background: `linear-gradient(170deg, ${mix(c.accent, c.bg, 0.78)} 0%, ${c.bg} 78%)`, color: "#fff", fontFamily: BODY, padding: "64px 60px 44px", display: "flex", flexDirection: "column", textAlign: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: -60, top: 380, fontFamily: COND, fontWeight: 800, fontSize: 290, lineHeight: 0.9, color: "transparent", WebkitTextStroke: `3px ${c.accent}2e`, whiteSpace: "nowrap" }}>{upper(d.monthName)}<br />FIXTURES</div>
      <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 36, position: "relative" }}>
        <Crest d={d} size={bs} />
        {badges.slice(0, 9).map((f, i) => <Badge key={i} src={f.logo} name={f.opp} size={bs} c={c} />)}
      </div>
      <div style={{ position: "relative", fontFamily: COND, fontWeight: 800, fontSize: 112, lineHeight: 1, marginTop: 56 }}>{upper(d.monthName)} FIXTURES</div>
      <div style={{ position: "relative", fontFamily: COND, fontWeight: 700, fontSize: 32, letterSpacing: 5, color: c.accent, marginTop: 12 }}>{[upper(d.club), upper(d.label), upper(d.comp)].filter(Boolean).join(" · ")}</div>
      <div style={{ position: "relative", flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 34 * k }}>
        {d.fixtures.map((f, i) => {
          const [L, R] = sides(f, d);
          const nm = (s) => (s.ours ? s.name : s.name + (s.sub ? "" : ""));
          const line = `${nm(L)} v ${nm(R)}`;
          return (
            <div key={i}>
              <div style={{ fontFamily: COND, fontWeight: 600, fontSize: nameSize(line, 58 * k), lineHeight: 1, whiteSpace: "nowrap" }}>{L.name} <span style={{ color: c.accent, fontSize: "0.7em" }}>v</span> {R.name}</div>
              <div style={{ fontFamily: COND, fontWeight: 600, fontSize: 24 * k + 2, letterSpacing: 4, marginTop: 8, color: mix("#ffffff", c.accent, 0.25) }}>{dayName(f.date)} {f.date.getDate()} {monthName(f.date)}, {f.time || "TBC"}{f.ha ? ` · ${f.ha === "A" ? "AWAY" : "HOME"}` : ""}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: d.leagueLogo ? "space-between" : "center", minHeight: 70 }}>
        <LeagueChip d={d} h={64} />
        {d.motto ? <div style={{ fontFamily: COND, fontWeight: 600, fontSize: 24, letterSpacing: 5, color: c.accent }}>{upper(d.motto)}</div> : null}
      </div>
    </div>
  );
}

// ── table: date headers and striped rows, like a broadcaster's fixture list ──
function TablePoster({ d }) {
  const c = d.colors, n = d.fixtures.length, k = kFor(n);
  const ink = c.bg;
  return (
    <div style={{ width: POSTER_W, height: POSTER_H, boxSizing: "border-box", background: `linear-gradient(170deg, ${mix(c.accent, c.bg, 0.78)} 0%, ${c.bg} 78%)`, color: "#fff", fontFamily: BODY, padding: "58px 50px 40px", display: "flex", flexDirection: "column", gap: 34 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 26, padding: "0 10px" }}>
        <Crest d={d} size={120} />
        <div style={{ flexGrow: 1, minWidth: 0 }}>
          <div style={{ fontFamily: COND, fontWeight: 800, fontSize: 88, lineHeight: 0.95 }}>FIXTURES</div>
          <div style={{ fontFamily: COND, fontWeight: 700, fontSize: 26, letterSpacing: 4, color: c.accent }}>{[upper(d.club), upper(d.label), upper(d.monthLabel)].filter(Boolean).join(" · ")}</div>
        </div>
        <LeagueChip d={d} h={110} />
      </div>
      <div style={{ background: "#fff", borderRadius: 26, overflow: "hidden", color: ink, display: "flex", flexDirection: "column", flexGrow: 1, minHeight: 0, maxHeight: 1000 }}>
        {d.fixtures.map((f, i) => {
          const [L, R] = sides(f, d);
          const piece = (s) => (s.ours ? <Crest d={d} size={80 * k} /> : <Badge src={s.logo} name={f.opp} size={80 * k} c={c} />);
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", flex: "1 1 0", minHeight: 0, background: i % 2 ? "#ffffff" : "#eef1f7" }}>
              <div style={{ textAlign: "center", fontFamily: COND, fontWeight: 700, fontSize: 30 * k + 2, letterSpacing: 1, padding: "14px 0 0" }}>{dayName(f.date)[0] + dayName(f.date).slice(1).toLowerCase()} {f.date.getDate()} {monthName(f.date)[0] + monthName(f.date).slice(1).toLowerCase()}</div>
              <div style={{ display: "flex", alignItems: "center", flexGrow: 1, padding: "0 22px" }}>
                <div style={{ flex: 1, minWidth: 0, textAlign: "right", paddingRight: 8, fontFamily: COND, fontWeight: 800, fontSize: nameSize(L.name, 46 * k), lineHeight: 1 }}>{L.name}</div>
                <div style={{ width: 100, display: "flex", justifyContent: "center" }}>{piece(L)}</div>
                <div style={{ width: 150, textAlign: "center", fontFamily: COND, fontWeight: 800, fontSize: 56 * k }}>{f.time || "TBC"}</div>
                <div style={{ width: 100, display: "flex", justifyContent: "center" }}>{piece(R)}</div>
                <div style={{ flex: 1, minWidth: 0, paddingLeft: 8, fontFamily: COND, fontWeight: 800, fontSize: nameSize(R.name, 46 * k), lineHeight: 1 }}>{R.name}</div>
              </div>
            </div>
          );
        })}
      </div>
      <Footer d={d} />
    </div>
  );
}

// ── pill: next fixture, white panel between the two sides ──
function PillPoster({ d }) {
  const c = d.colors, f = d.fixtures[0];
  const oppCol = useColour(f && f.logo);
  if (!f) return <div style={{ width: POSTER_W, height: POSTER_H, background: c.bg }} />;
  const [L, R] = sides(f, d);
  const us = L.ours ? L : R, them = L.ours ? R : L;
  const oc = oppCol || c.accent;
  const onOpp = contrast(oc, "#ffffff") >= 3 ? "#ffffff" : "#0b1320";
  const away = f.ha === "A";
  const panel = (left) => ({ position: "absolute", top: 0, [left ? "left" : "right"]: 0, width: 560, height: POSTER_H });
  const st = d.stats;
  const lab = { fontFamily: COND, fontWeight: 700, fontSize: 20, letterSpacing: 5, opacity: 0.7 };
  const RC = { W: "#1f8f55", D: "#c58a1a", L: "#b03030" };
  const tile = (r, i) => <div key={i} style={{ width: 40, height: 40, borderRadius: 8, background: RC[r] || "#5b6b82", color: "#fff", fontFamily: COND, fontWeight: 800, fontSize: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>{r}</div>;
  const rec = st && st.record;
  const lastRes = st && st.last;
  const ours = (
    <>
      <div style={{ ...panel(true), background: `linear-gradient(160deg, ${mix(c.accent, c.bg, 0.7)}, ${mix(c.bg, "#000000", 0.35)})` }} />
      {d.crest && !svgSrc(d.crest) ? <img src={d.crest} alt="" style={{ position: "absolute", left: -330, top: 330, width: 660, height: 660, objectFit: "contain", opacity: 0.22 }} /> : null}
      {st ? (
        <div style={{ position: "absolute", left: 30, top: 130, width: 235 }}>
          {st.form.length ? <>
            <div style={lab}>FORM</div>
            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>{st.form.map(tile)}</div>
          </> : null}
          {st.topScorer ? <div style={{ marginTop: 56 }}>
            <div style={lab}>TOP SCORER</div>
            <div style={{ fontFamily: COND, fontWeight: 800, fontSize: 40, lineHeight: 1.05, marginTop: 10 }}>{upper(st.topScorer.name)}</div>
            <div style={{ fontFamily: COND, fontWeight: 700, fontSize: 26, letterSpacing: 3, color: c.accent, marginTop: 4 }}>{st.topScorer.goals} GOAL{st.topScorer.goals === 1 ? "" : "S"}</div>
          </div> : null}
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 30, bottom: 60, fontFamily: COND, fontWeight: 800, fontSize: nameSize(us.name, 46), lineHeight: 1, maxWidth: 380 }}>{us.name}{us.sub ? <div style={{ fontWeight: 700, fontSize: 24, letterSpacing: 5, color: c.accent, marginTop: 4 }}>{us.sub}</div> : null}</div>
    </>
  );
  const theirs = (
    <>
      <div style={{ ...panel(false), background: `linear-gradient(200deg, ${mix(oc, "#ffffff", 0.12)}, ${mix(oc, "#000000", 0.35)})` }} />
      {them.logo && !svgSrc(them.logo) ? <img src={them.logo} alt="" style={{ position: "absolute", right: -330, top: 330, width: 660, height: 660, objectFit: "contain", opacity: 0.3 }} /> : null}
      {st ? (
        <div style={{ position: "absolute", right: 30, top: 130, width: 235, textAlign: "right", color: onOpp }}>
          <div style={lab}>LAST MEETING</div>
          {lastRes ? <>
            <div style={{ fontFamily: COND, fontWeight: 700, fontSize: 26, letterSpacing: 2, marginTop: 10 }}>{upper(lastRes.date)}</div>
            <div style={{ fontFamily: COND, fontWeight: 800, fontSize: 76, lineHeight: 1, marginTop: 4 }}>{lastRes.score}</div>
            <div style={{ display: "inline-block", marginTop: 8, padding: "2px 14px", borderRadius: 8, background: RC[lastRes.result] || "#5b6b82", color: "#fff", fontFamily: COND, fontWeight: 800, fontSize: 24, letterSpacing: 3 }}>{lastRes.result === "W" ? "WIN" : lastRes.result === "L" ? "LOSS" : "DRAW"}</div>
            <div style={{ ...lab, marginTop: 56 }}>PLAYED {rec.n}</div>
            <div style={{ fontFamily: COND, fontWeight: 800, fontSize: 40, letterSpacing: 2, marginTop: 10 }}>W{rec.w} D{rec.d} L{rec.l}</div>
          </> : <div style={{ fontFamily: COND, fontWeight: 800, fontSize: 36, lineHeight: 1.1, marginTop: 12 }}>FIRST TIME FACING THIS SEASON</div>}
        </div>
      ) : null}
      <div style={{ position: "absolute", right: 30, bottom: 60, textAlign: "right", color: onOpp, fontFamily: COND, fontWeight: 800, fontSize: nameSize(them.name, 46), lineHeight: 1, maxWidth: 380 }}>{them.name}{them.sub ? <div style={{ fontWeight: 700, fontSize: 24, letterSpacing: 5, marginTop: 4, opacity: 0.85 }}>{them.sub}</div> : null}</div>
    </>
  );
  return (
    <div style={{ width: POSTER_W, height: POSTER_H, boxSizing: "border-box", background: c.bg, color: "#fff", fontFamily: BODY, position: "relative", overflow: "hidden" }}>
      {ours}{theirs}
      <div style={{ position: "absolute", left: 290, top: 70, width: 500, height: 1110, background: "#ffffff", borderRadius: 90, color: c.bg, textAlign: "center", padding: "50px 0", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-evenly" }}>
        {d.leagueLogo && !svgSrc(d.leagueLogo)
          ? <img src={d.leagueLogo} alt="" style={{ height: 130, width: "auto" }} />
          : <div style={{ fontFamily: COND, fontWeight: 700, fontSize: 32, letterSpacing: 6, color: c.bg, opacity: 0.7 }}>{upper(f.compLabel)}</div>}
        <Crest d={d} size={210} />
        <div style={{ fontFamily: COND, fontWeight: 800, fontSize: 70, lineHeight: 1 }}>V</div>
        <div style={{ width: 210, height: 210, borderRadius: 105, border: "6px solid #e8edf4", boxSizing: "border-box" }}><Badge src={them.logo} name={f.opp} size={198} c={c} /></div>
        <div style={{ fontFamily: COND, fontWeight: 800, fontSize: 62, lineHeight: 1 }}>{dayName(f.date)}</div>
        <div style={{ fontFamily: COND, fontWeight: 800, fontSize: 84, lineHeight: 1, color: mix(c.bg, c.accent, 0.35) }}>{f.time || "TBC"}</div>
        <div style={{ fontFamily: COND, fontWeight: 700, fontSize: 26, letterSpacing: 5 }}>{f.date.getDate()} {upper(monthName(f.date))}{f.ha ? ` · ${away ? "AWAY" : "HOME"}` : ""}</div>
      </div>
    </div>
  );
}

export function PosterCanvas({ layout, d }) {
  if (layout === "tickets") return <TicketPoster d={d} />;
  if (layout === "single") return <SinglePoster d={d} />;
  if (layout === "grid") return <GridPoster d={d} />;
  if (layout === "table") return <TablePoster d={d} />;
  if (layout === "pill") return <PillPoster d={d} />;
  return <NextPoster d={d} />;
}

// Barlow isn't part of the app's own fonts, so load it before drawing a poster.
let fontsPromise = null;
export function ensurePosterFonts() {
  if (!fontsPromise) {
    fontsPromise = new Promise((resolve) => {
      if (!document.getElementById("poster-fonts")) {
        const l = document.createElement("link");
        l.id = "poster-fonts"; l.rel = "stylesheet";
        l.href = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@500;600&display=swap";
        document.head.appendChild(l);
      }
      const want = ["600 24px 'Barlow Condensed'", "700 24px 'Barlow Condensed'", "800 24px 'Barlow Condensed'", "500 20px 'Barlow'"];
      const t = setTimeout(resolve, 5000); // never block the poster on a slow font
      Promise.all(want.map((f) => document.fonts.load(f).catch(() => null))).then(() => { clearTimeout(t); resolve(); });
    });
  }
  return fontsPromise;
}
