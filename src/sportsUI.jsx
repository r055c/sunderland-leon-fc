// Pieces shared by the "Sports" look: round badges (with initials fallback) and small helpers.
import React from "react";

const PALETTE = ["#c8102e", "#2a6fdb", "#f5a000", "#1f8a4c", "#7a1f3d", "#6e4bd8", "#d9531e", "#0e8f8f"];
export const hashColor = (s) => { let h = 0; for (const ch of String(s || "?")) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return PALETTE[h % PALETTE.length]; };
export const initialsOf = (n) => String(n || "?").replace(/&/g, " ").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

// A round badge. `src` may be a normal image; without one (or for SVGs the exporter can't draw) it shows coloured initials.
export function SBadge({ src, name, size = 32, ours = false, white = true }) {
  const ok = !!src; // on-screen only, so SVGs are fine here
  const box = { width: size, height: size, borderRadius: "50%", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" };
  if (ok) return <div style={{ ...box, background: white ? "#fff" : "transparent" }}><img src={src} alt="" style={{ width: ours ? "100%" : "78%", height: ours ? "100%" : "78%", objectFit: ours ? "cover" : "contain" }} /></div>;
  const c = hashColor(name);
  return <div style={{ ...box, background: c, color: "#fff", fontWeight: 800, fontSize: size * 0.36, letterSpacing: -0.5 }}>{initialsOf(name)}</div>;
}

// Line icons (Sports look). 24x24 grid, drawn with strokes so they pick up the surrounding text colour.
const PATHS = {
  home: <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  list: <><path d="M8 6h12M8 12h12M8 18h12" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></>,
  photo: <><rect x="3" y="5" width="18" height="14" rx="3" /><circle cx="9" cy="10" r="1.6" /><path d="m4 18 5-5 4 4 3-3 4 4" /></>,
  people: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><circle cx="17" cy="9" r="2.4" /><path d="M17 14.5c2.5 0 4 1.7 4 4" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  unlock: <><rect x="5" y="11" width="14" height="9" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 7.5-2" /></>,
  ball: <><circle cx="12" cy="12" r="9" /><path d="m12 8 3.5 2.5-1.4 4h-4.2l-1.4-4z" /><path d="M12 3v5M20.5 9.5 15.5 10.5M17 19l-2.9-4.5M7 19l2.9-4.5M3.5 9.5l5 1" /></>,
  star: <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8 6.8 19.6l1-5.8L3.5 9.7l5.9-.9z" />,
  back: <path d="m15 5-7 7 7 7" />,
  share: <><path d="M12 15V4M8 8l4-4 4 4" /><path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" /></>,
  play: <path d="M8 5v14l11-7z" />,
  cal: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  trophy: <path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v4M8 20h8" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
};
export function Icon({ name, size = 24, filled = false, color = "currentColor", style }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={filled ? color : "none"} stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }} aria-hidden="true">{PATHS[name]}</svg>
  );
}

// Big left-aligned page title that shrinks to a small centred one once the page is scrolled.
export function LargeTitle({ text, bg, color = "#fff" }) {
  const [small, setSmall] = React.useState(false);
  React.useEffect(() => {
    const f = () => setSmall(window.scrollY > 36);
    f(); window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 20, background: bg, margin: "-20px -16px 8px", padding: small ? "12px 16px" : "20px 16px 8px", textAlign: small ? "center" : "left", borderBottom: small ? "1px solid #38383a" : "1px solid transparent", transition: "padding .2s ease, border-color .2s ease" }}>
      <div style={{ fontSize: small ? 17 : 34, fontWeight: 800, letterSpacing: small ? 0 : -0.5, color, lineHeight: 1.1, transition: "font-size .2s ease" }}>{text}</div>
    </div>
  );
}
