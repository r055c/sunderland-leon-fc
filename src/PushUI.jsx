// Goal alerts screens: the card parents see on Home, and the staff settings screen.
import React, { useEffect, useState } from "react";
import { Icon } from "./sportsUI.jsx";
import { pushState, enablePush, disablePush, savePrefs, PREF_LABELS, fetchPushSettings, savePushSettings, needsInstall } from "./push.js";

const DISMISS_KEY = "goalAlertsDismissed";
const dismissed = () => { try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch (e) { return false; } };
const setDismissed = (v) => { try { v ? localStorage.setItem(DISMISS_KEY, "1") : localStorage.removeItem(DISMISS_KEY); } catch (e) {} };

const Switch = ({ on, onChange, T }) => (
  <button role="switch" aria-checked={on} onClick={() => onChange(!on)} style={{ width: 46, height: 28, borderRadius: 99, border: "none", background: on ? "#30d158" : (T.sports ? "#39393d" : "#c8ccd6"), position: "relative", cursor: "pointer", flexShrink: 0, transition: "background .15s" }}>
    <span style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 22, height: 22, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
  </button>
);

// Shown on Home to everyone (not just staff).
export function PushCard({ T }) {
  const [st, setSt] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [hide, setHide] = useState(dismissed());
  useEffect(() => { pushState().then(setSt).catch(() => setSt({ status: "unsupported" })); }, []);
  if (!st || st.status === "unsupported" || st.status === "blocked") return null;
  const txt = T.sports ? "#fff" : T.text;
  const card = { background: T.white, borderRadius: T.sports ? 22 : 14, padding: "14px 16px", marginBottom: 16, color: txt, boxShadow: T.sports ? "none" : "0 2px 8px rgba(18,23,46,0.06)" };
  const bell = <Icon name="bell" size={22} color={T.sports ? T.sky : T.navy} />;
  const turnOn = async () => {
    setBusy(true); setErr("");
    try { const r = await enablePush(); setSt(r); setDismissed(false); setHide(false); if (r.status === "on") setOpen(true); }
    catch (e) { setErr("Couldn't turn alerts on. Check your signal and try again."); }
    setBusy(false);
  };

  if (st.status === "install") {
    if (hide) return null;
    return (
      <div style={card}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>{bell}<b style={{ fontSize: 15 }}>Get goal alerts</b></div>
        <div style={{ fontSize: 13, color: T.ink60, lineHeight: 1.5 }}>On iPhone, alerts work once this app is on your Home Screen: tap the Share button in Safari, choose Add to Home Screen, then open it from there and turn alerts on.</div>
        <button onClick={() => { setDismissed(true); setHide(true); }} style={{ background: "none", border: "none", color: T.ink60, fontSize: 13, fontFamily: "inherit", cursor: "pointer", padding: "10px 0 0" }}>Not now</button>
      </div>
    );
  }
  if (st.status === "off") {
    if (hide) return null;
    return (
      <div style={card}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>{bell}<b style={{ fontSize: 15 }}>Get goal alerts</b></div>
        <div style={{ fontSize: 13, color: T.ink60, lineHeight: 1.5, marginBottom: 12 }}>Know when we score, even when the app is closed.</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={turnOn} disabled={busy} style={{ background: T.sports ? T.sky : T.navy, color: T.sports ? T.onSky : T.sky, border: "none", borderRadius: 99, padding: "9px 18px", fontWeight: 700, fontSize: 14, fontFamily: "inherit", cursor: "pointer" }}>{busy ? "Turning on…" : "Turn on alerts"}</button>
          <button onClick={() => { setDismissed(true); setHide(true); }} style={{ background: "none", border: "none", color: T.ink60, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>Not now</button>
        </div>
        {err && <div style={{ color: "#ff453a", fontSize: 12, marginTop: 8 }}>{err}</div>}
      </div>
    );
  }
  // on
  const prefs = st.prefs || { goals: true, theirs: true, kickoff: false, halftime: false, fulltime: true };
  const set = (k, v) => { const next = { ...prefs, [k]: v }; setSt({ ...st, prefs: next }); savePrefs(next).catch(() => {}); };
  return (
    <div style={card}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", padding: 0, color: txt, fontFamily: "inherit", cursor: "pointer", textAlign: "left" }}>
        {bell}<span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>Goal alerts are on</span><span style={{ color: T.ink60, fontSize: 13 }}>{open ? "Close" : "Choose"}</span>
      </button>
      {open && (
        <div style={{ marginTop: 10 }}>
          {PREF_LABELS.map(([k, label]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderTop: `1px solid ${T.ink30}`, fontSize: 14 }}>
              <span>{label}</span><Switch T={T} on={!!prefs[k]} onChange={v => set(k, v)} />
            </div>
          ))}
          <button onClick={async () => { await disablePush(); setSt({ status: "off" }); setOpen(false); }} style={{ background: "none", border: "none", color: "#ff453a", fontSize: 13, fontFamily: "inherit", cursor: "pointer", padding: "10px 0 0" }}>Turn off alerts on this phone</button>
        </div>
      )}
    </div>
  );
}

// Staff Room: one switch for scorer names, and how many phones are signed up.
export function AlertsSettings({ T, onBack, showToast }) {
  const [s, setS] = useState(null);
  useEffect(() => { fetchPushSettings().then(setS).catch(() => showToast("Couldn't load alert settings")); }, []);
  const txt = T.sports ? "#fff" : T.text;
  const row = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "12px 0" };
  return (
    <div style={{ maxWidth: 520, margin: "0 auto", color: txt }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: T.ink60, fontFamily: T.mono, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", padding: "0 0 12px" }}>‹ Back</button>
      <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 20, marginBottom: 10 }}>Goal alerts</div>
      <div style={{ background: T.white, borderRadius: 14, padding: "6px 16px" }}>
        <div style={row}>
          <div><div style={{ fontSize: 15, fontWeight: 700 }}>Name the scorer</div><div style={{ fontSize: 12, color: T.ink60, marginTop: 2 }}>Alerts say who scored. Turn off to show only the minute.</div></div>
          <Switch T={T} on={s ? s.names : true} onChange={async v => { setS({ ...s, names: v }); try { await savePushSettings({ names: v }); } catch (e) { showToast("Couldn't save that"); } }} />
        </div>
        <div style={{ ...row, borderTop: `1px solid ${T.ink30}` }}>
          <div><div style={{ fontSize: 15, fontWeight: 700 }}>Phones signed up</div><div style={{ fontSize: 12, color: T.ink60, marginTop: 2 }}>Parents turn alerts on from the Home screen.</div></div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{s ? s.subscribers : "–"}</div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: T.ink60, lineHeight: 1.6, marginTop: 14 }}>
        Goals are sent 30 seconds after you score them, so a mistaken tap can be undone: delete the goal within 30 seconds and nothing is sent. If it was already sent, parents get a short correction. Kick-off, half time and full time alerts go straight away.
      </div>
    </div>
  );
}
