// Fixtures poster: four 1080x1350 (4:5) layouts, drawn with plain inline styles so html2canvas can export them.
// Nothing club-specific is hard-coded: names, crest, colours, label and motto all arrive through `d`.
import { mix, contrast } from "./branding.js";

export const POSTER_W = 1080, POSTER_H = 1350;
export const POSTER_LAYOUTS = [
  { id: "next", name: "Next up + coming up" },
  { id: "tickets", name: "Matchday tickets" },
  { id: "single", name: "Next fixture only" },
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

function Badge({ src, name, size, c, ring }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size / 2, background: "#ffffff", border: ring ? `3px solid ${c.accent}` : "none", boxSizing: "border-box", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {src ? <img src={src} alt="" style={{ width: "84%", height: "84%", objectFit: "contain" }} />
        : <div style={{ fontFamily: COND, fontWeight: 800, fontSize: size * 0.4, color: "#0b1320" }}>{initials(name)}</div>}
    </div>
  );
}
function Crest({ d, size }) {
  const c = d.colors;
  // SVG crests can't be drawn into the exported image, so those fall back to initials.
  const ok = d.crest && !/^data:image\/svg|\.svg(\?|$)/i.test(d.crest);
  return ok
    ? <img src={d.crest} alt="" style={{ width: size, height: size, objectFit: "contain", borderRadius: size / 2, flexShrink: 0 }} />
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
      <div style={{ textAlign: "right" }}>
        <div style={{ fontFamily: COND, fontWeight: 800, fontSize: 64, lineHeight: 1 }}>{upper(d.monthName)}</div>
        <div style={{ fontFamily: COND, fontWeight: 700, fontSize: 26, letterSpacing: 4, color: c.accent }}>{d.year}</div>
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
        <Crest d={d} size={130} />
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

export function PosterCanvas({ layout, d }) {
  if (layout === "tickets") return <TicketPoster d={d} />;
  if (layout === "single") return <SinglePoster d={d} />;
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
