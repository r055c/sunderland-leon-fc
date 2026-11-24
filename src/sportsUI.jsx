// Pieces shared by the "Sports" look: round badges (with initials fallback) and small helpers.
import React from "react";

const PALETTE = ["#c8102e", "#2a6fdb", "#f5a000", "#1f8a4c", "#7a1f3d", "#6e4bd8", "#d9531e", "#0e8f8f"];
export const hashColor = (s) => { let h = 0; for (const ch of String(s || "?")) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return PALETTE[h % PALETTE.length]; };
export const initialsOf = (n) => String(n || "?").replace(/&/g, " ").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const isSvg = (u) => /^data:image\/svg|\.svg(\?|$)/i.test(u || "");

// A round badge. `src` may be a normal image; without one (or for SVGs the exporter can't draw) it shows coloured initials.
export function SBadge({ src, name, size = 32, ours = false, white = true }) {
  const ok = src && !isSvg(src);
  const box = { width: size, height: size, borderRadius: "50%", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" };
  if (ok) return <div style={{ ...box, background: white ? "#fff" : "transparent" }}><img src={src} alt="" style={{ width: ours ? "100%" : "78%", height: ours ? "100%" : "78%", objectFit: ours ? "cover" : "contain" }} /></div>;
  const c = hashColor(name);
  return <div style={{ ...box, background: c, color: "#fff", fontWeight: 800, fontSize: size * 0.36, letterSpacing: -0.5 }}>{initialsOf(name)}</div>;
}
