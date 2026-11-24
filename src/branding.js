// Club branding: presets, font pairings, palette derivation with readability safeguards.
const hex2rgb = h => { h = h.replace("#", ""); if (h.length === 3) h = h.split("").map(c => c + c).join(""); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgb2hex = (r, g, b) => "#" + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
export const mix = (a, b, t) => { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); };
const lum = h => { const c = hex2rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
export const contrast = (a, b) => { const L1 = lum(a), L2 = lum(b); return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); };
const isHex = v => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);

export const FONTS = [
  { id: "classic", name: "Classic sport", display: "'Oswald', sans-serif", body: "'Work Sans', sans-serif", sample: "Riverside United" },
  { id: "bold", name: "Bold & modern", display: "'Bebas Neue', sans-serif", body: "'Inter', sans-serif", sample: "RIVERSIDE UNITED" },
  { id: "friendly", name: "Friendly", display: "'Fredoka', sans-serif", body: "'Nunito', sans-serif", sample: "Riverside United" },
];
export const LOOKS = [
  { id: "classic", name: "Classic", desc: "Light cards, club colours" },
  { id: "sports", name: "Sports", desc: "Dark, big badges, compact rows" },
];
export const PRESETS = [
  { n: "Navy & Sky", p: "#12172e", a: "#5fb2d9" },
  { n: "Claret & Gold", p: "#7a1630", a: "#f0b429" },
  { n: "Royal & Yellow", p: "#1b3a8a", a: "#f5c518" },
  { n: "Green & Mint", p: "#0f2a1d", a: "#3ecf8e" },
  { n: "Black & Orange", p: "#17181c", a: "#ff8a1f" },
  { n: "Red & Sky", p: "#9b111e", a: "#7cc6f2" },
];
export const DEFAULT_BRANDING = {
  club_name: "My Club FC", short_name: "My Club", slogan: "",
  primary_color: "#12172e", accent_color: "#5fb2d9", font_pairing: "classic", badge_url: null, league_logo: null, league_name: "", poster_styles: null, poster_label: null, look: "classic",
};

// Returns the theme tokens derived from the chosen colours.
export function deriveTheme(b) {
  const x = { ...DEFAULT_BRANDING, ...b };
  let navy = isHex(x.primary_color) ? x.primary_color : DEFAULT_BRANDING.primary_color;
  let n = 0; while (contrast(navy, "#ffffff") < 4.5 && n++ < 20) navy = mix(navy, "#000000", 0.1); // white text must stay readable
  let sky = isHex(x.accent_color) ? x.accent_color : DEFAULT_BRANDING.accent_color;
  n = 0; while (contrast(sky, navy) < 3 && n++ < 20) sky = mix(sky, "#ffffff", 0.1); // accent must stand out on primary
  let skyInk = sky;
  n = 0; while (contrast(skyInk, "#ffffff") < 4.5 && n++ < 20) skyInk = mix(skyInk, "#000000", 0.1); // accent text on white cards
  const f = FONTS.find(f => f.id === x.font_pairing) || FONTS[0];
  if (x.look === "sports") {
    const SF = "-apple-system, 'SF Pro Display', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
    let acc = isHex(x.accent_color) ? x.accent_color : DEFAULT_BRANDING.accent_color;
    n = 0; while (contrast(acc, "#000000") < 5 && n++ < 20) acc = mix(acc, "#ffffff", 0.1);
    let nv = mix(isHex(x.primary_color) ? x.primary_color : DEFAULT_BRANDING.primary_color, acc, 0.16); // dark panels that still show on black
    n = 0; while (contrast(nv, "#1c1c1e") < 1.3 && n++ < 20) nv = mix(nv, "#ffffff", 0.06);
    return {
      sports: true, navy: nv, navySoft: mix(nv, "#ffffff", 0.1), sky: acc, skyInk: acc, chalk: "#000000", white: "#1c1c1e", text: "#ffffff",
      ink60: "#8e8e93", ink30: "#3a3a3c", pitch: "#30d158", pitchSoft: "#10301b", amber: "#ffd60a", loss: "#ff453a",
      display: SF, body: SF, mono: SF,
      onSky: contrast(acc, "#ffffff") >= contrast(acc, "#000000") ? "#ffffff" : "#000000", lightAccent: false,
    };
  }
  return {
    sports: false, text: navy, white: "#ffffff", ink60: "#6b7280", ink30: "#c7cbd6", pitch: "#1f6f4a", pitchSoft: "#e5f3ec", amber: "#e8a93b", loss: "#d1495b",
    navy, navySoft: mix(navy, "#ffffff", 0.1), sky, skyInk, chalk: mix(navy, "#ffffff", 0.955),
    display: f.display, body: f.body,
    onSky: contrast(sky, "#ffffff") >= contrast(sky, "#12172e") ? "#ffffff" : "#12172e",
    lightAccent: skyInk !== sky,
  };
}
// Light literal colours (hard-coded in screens) are swapped for dark equivalents in the Sports look.
let SPORTS = false;
export function L(c) {
  if (!SPORTS) return c;
  const l = lum(c);
  return l > 0.8 ? "#2c2c2e" : l > 0.55 ? "#3a3a3c" : c;
}
export function applyBranding(theme, b) { const t = deriveTheme(b); SPORTS = !!t.sports; Object.assign(theme, t); }

const CACHE_KEY = "leon_branding_v1";
export function loadCachedBranding() { try { return { ...DEFAULT_BRANDING, ...JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") }; } catch (e) { return { ...DEFAULT_BRANDING }; } }
export function cacheBranding(b) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(b)); } catch (e) {} }
