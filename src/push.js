// Goal alerts, phone side: subscribe/unsubscribe, preferences, and (for staff) queueing alerts.
import { scoreOf, goalsOf } from "./liveMatch.js";

let adminPin = "";
export const setPushPin = (p) => { adminPin = p || ""; };
const post = (path, body, auth) => fetch(`/api/push/${path}`, { method: "POST", headers: { "Content-Type": "application/json", ...(auth ? { "x-admin-pin": adminPin } : {}) }, body: JSON.stringify(body || {}) });

export const PREF_LABELS = [
  ["goals", "Our goals"],
  ["theirs", "Opposition goals"],
  ["kickoff", "Kick-off"],
  ["halftime", "Half time"],
  ["fulltime", "Full time"],
];

export const pushSupported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
// iPhones only allow alerts for an app that has been added to the Home Screen.
export const needsInstall = () => isIOS() && !isStandalone();

// If the service worker never becomes ready (first visit, or not registered), give up rather than hang.
const reg = () => Promise.race([navigator.serviceWorker.ready, new Promise((_, rej) => setTimeout(() => rej(new Error("no service worker")), 6000))]);
const currentSub = async () => { try { return await (await reg()).pushManager.getSubscription(); } catch (e) { return null; } };

// → { status: "unsupported" | "install" | "blocked" | "off" | "on", prefs }
export async function pushState() {
  if (needsInstall()) return { status: "install" };
  if (!pushSupported()) return { status: "unsupported" };
  if (Notification.permission === "denied") return { status: "blocked" };
  const sub = await currentSub();
  if (!sub) return { status: "off" };
  try {
    const r = await (await post("prefs-get", { endpoint: sub.endpoint })).json();
    if (r.subscribed) return { status: "on", prefs: r.prefs };
  } catch (e) { /* offline: assume still on */ return { status: "on", prefs: null }; }
  return { status: "off" };
}

export async function enablePush(prefs) {
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { status: perm === "denied" ? "blocked" : "off" };
  const { key } = await (await fetch("/api/push/key")).json();
  const r = await reg();
  let sub = await r.pushManager.getSubscription();
  if (!sub) sub = await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(atob(key.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (key.length % 4)) % 4)), (c) => c.charCodeAt(0)) });
  const res = await post("subscribe", { subscription: sub.toJSON(), prefs });
  if (!res.ok) throw new Error("Couldn't save your alerts");
  return pushState();
}
export async function disablePush() {
  const sub = await currentSub();
  if (sub) { try { await post("unsubscribe", { endpoint: sub.endpoint }); } catch (e) {} try { await sub.unsubscribe(); } catch (e) {} }
}
export async function savePrefs(prefs) {
  const sub = await currentSub();
  if (sub) await post("prefs", { endpoint: sub.endpoint, prefs });
}

// ── Staff: queue alerts from the live screen. Never allowed to break scoring, so everything is swallowed. ──
const safe = async (fn) => { try { await fn(); } catch (e) { /* alerts are best-effort */ } };
let flushTimer = null;
// The Worker also sends due alerts every minute by itself; this just makes the 30-second delay exact while the app is open.
const flushSoon = () => { clearTimeout(flushTimer); flushTimer = setTimeout(() => safe(() => post("flush")), 31000); };
const queue = (a, delay) => safe(async () => { await post("queue", { ...a, delay }, true); if (delay !== 0) flushSoon(); });
const cancel = (key, correction) => safe(() => post("cancel", { key, correction }, true));

const sameGoal = (a, b) => a.min === b.min && a.side === b.side && a.name === b.name && !!a.own === !!b.own;

function goalAlert(live, g, self) {
  const s = scoreOf({ goals: goalsOf(live) });
  const key = `g:${live.id}:${g.id}`;
  const line = `${self} ${s.us}–${s.them} ${live.opposition}`;
  if (g.side === "them") return { key, kind: "goal_them", title: `${live.opposition} score · ${line}`, body: `${g.min}'`, bodyAnon: `${g.min}'` };
  const who = g.own ? "Own goal" : g.name ? `${g.name} scored` : "Goal";
  return { key, kind: "goal_us", title: `⚽ GOAL! ${line}`, body: `${who} · ${g.min}'`, bodyAnon: `${g.own ? "Own goal" : "Goal"} · ${g.min}'` };
}

// Called with the live match before and after a change. Works out which alerts that change means.
export function alertsForChange(prev, next, self) {
  if (!prev || !next) return;
  const before = new Map(goalsOf(prev).map((g) => [g.id, g]));
  const after = new Map(goalsOf(next).map((g) => [g.id, g]));
  const line = () => { const s = scoreOf({ goals: goalsOf(next) }); return `${self} ${s.us}–${s.them} ${next.opposition}`; };
  for (const [id, g] of after) {
    if (!before.has(id) || !sameGoal(before.get(id), g)) queue(goalAlert(next, g, self));
  }
  for (const [id] of before) {
    if (!after.has(id)) cancel(`g:${next.id}:${id}`, { title: `Correction · ${line()}`, body: "A goal was taken off the scoreboard." });
  }
  if (prev.phase === "h1" && next.phase === "ht") queue({ key: `ht:${next.id}`, kind: "halftime", title: `Half time · ${line()}`, body: "", bodyAnon: "" }, 0);
}
export function alertKickoff(row, self) {
  if (!row) return;
  queue({ key: `ko:${row.id}`, kind: "kickoff", title: "Kick-off", body: `${self} v ${row.opposition}`, bodyAnon: `${self} v ${row.opposition}` }, 0);
}
export function alertFullTime(live, self) {
  const s = scoreOf({ goals: goalsOf(live) });
  const head = s.us > s.them ? `Full time · ${self} win!` : s.us < s.them ? "Full time" : "Full time · Draw";
  const line = `${self} ${s.us}–${s.them} ${live.opposition}`;
  queue({ key: `ft:${live.id}`, kind: "fulltime", title: head, body: line, bodyAnon: line }, 0);
}
export function cancelAllForMatch(live) {
  goalsOf(live).forEach((g) => cancel(`g:${live.id}:${g.id}`));
}

// Staff Room settings
export async function fetchPushSettings() {
  const r = await fetch("/api/push/settings", { headers: { "x-admin-pin": adminPin } });
  if (!r.ok) throw new Error("settings");
  return r.json();
}
export const savePushSettings = (s) => post("settings", s, true);
