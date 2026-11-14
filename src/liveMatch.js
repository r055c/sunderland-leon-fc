// Live match scoring: pure logic (no React) so it can be tested on its own.
// A live match row keeps the clock as: base_ms (time already played) + (now - run_since) while the clock is running.

export const elapsedMs = (live, now = Date.now()) => Math.max(0, (live?.base_ms || 0) + (live?.run_since ? now - live.run_since : 0));
// Football minutes: the first minute is 1', so 14:32 on the clock is 15'.
export const minuteOf = (live, now = Date.now()) => Math.floor(elapsedMs(live, now) / 60000) + 1;
export function clockText(live, now = Date.now()) {
  const s = Math.floor(elapsedMs(live, now) / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
export const PHASE_LABEL = { h1: "1ST HALF", ht: "HALF TIME", h2: "2ND HALF" };

// Next clock state when a button is pressed. Returns the fields to save.
export function pauseForHalfTime(live, now = Date.now()) {
  return { phase: "ht", base_ms: elapsedMs(live, now), run_since: null };
}
export const startSecondHalf = (now = Date.now()) => ({ phase: "h2", run_since: now });

export const goalsOf = (live) => Array.isArray(live?.goals) ? live.goals : [];
export const scoreOf = (live) => {
  const g = goalsOf(live);
  return { us: g.filter(x => x.side === "us").length, them: g.filter(x => x.side === "them").length };
};
export const newGoalId = () => Date.now() * 1000 + Math.floor(Math.random() * 1000);
export const sortedGoals = (goals) => [...goals].sort((a, b) => a.min - b.min || a.id - b.id);

// Everything the saved result needs, built from the goal list.
//   scorers   : ["Finn ×2", "Alfie"]  (our players only; own goals and "not sure" goals are in the score but not here)
//   goal_times: [{ min, name, side }] in minute order, for the timeline on the result
export function buildResultFields(live) {
  const goals = sortedGoals(goalsOf(live));
  const us = goals.filter(g => g.side === "us"), them = goals.filter(g => g.side === "them");
  const counts = {};
  us.forEach(g => { if (g.name && !g.own) counts[g.name] = (counts[g.name] || 0) + 1; });
  const scorers = Object.entries(counts).map(([n, c]) => (c > 1 ? `${n} ×${c}` : n));
  const goal_times = goals.map(g => ({ min: g.min, side: g.side, name: g.side === "them" ? "Opposition" : g.own ? "Own goal" : (g.name || "") }));
  return { homeScore: us.length, awayScore: them.length, scorers, goal_times };
}

// "6' Alfie · 14' Finn" for the result card.
export const timelineText = (goal_times) => (goal_times || []).map(g => `${g.min}' ${g.name || "Goal"}`).join("  ·  ");
