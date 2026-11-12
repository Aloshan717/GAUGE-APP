// EVOLVE — what you burned this week, from your watch: only the active
// calories (the Move ring), from Sunday to now.
//
// The Shortcut link sends today's active energy plus your resting energy for
// the whole day (built into the link), so that resting part is taken back out.
import { store } from "./api.js";
import { addDays, burnByDate } from "./body.js";

// The resting energy inside the link you pasted into the Shortcut (saved when
// you copy the link; until then, your current resting energy is the best guess).
const restKey = (uid) => `evolve_sync_rest_${uid || "me"}`;
export const linkResting = (uid) => Number(store.get(restKey(uid))) || null;
export const saveLinkResting = (uid, kcal) => { if (kcal > 0) store.set(restKey(uid), String(Math.round(kcal))); };

// The week starts on Sunday.
export const sundayOf = (iso) => addDays(iso, -new Date(`${iso}T12:00:00`).getDay());

// Sunday → Saturday of this week: each day's active calories (null = nothing
// from the watch that day), the total so far (back to zero every Sunday), the
// average of its full days — and last week's daily average, from its readings.
export function burnWeek({ days, sessions, today, resting }) {
  if (!(resting > 0)) return null;
  const burns = burnByDate(days, sessions);
  const activeOn = (date) => { const whole = burns.get(date); return whole != null ? Math.max(0, Math.round(whole - resting)) : null; };
  const from = sundayOf(today);
  const rows = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(from, i);
    return { date, active: date <= today ? activeOn(date) : null, today: date === today, future: date > today };
  });
  const got = rows.filter((r) => r.active != null);
  const full = got.filter((r) => !r.today);
  const sum = (list) => list.reduce((a, v) => a + v, 0);
  const lastFrom = addDays(from, -7);
  const lastVals = Array.from({ length: 7 }, (_, i) => activeOn(addDays(lastFrom, i))).filter((v) => v != null);
  return {
    from, to: addDays(from, 6), rows,
    total: sum(got.map((r) => r.active)),
    days: got.length,
    avg: full.length ? Math.round(sum(full.map((r) => r.active)) / full.length) : null,
    today: rows.find((r) => r.today)?.active ?? null,
    last: { from: lastFrom, to: addDays(from, -1), total: sum(lastVals), days: lastVals.length, avg: lastVals.length ? Math.round(sum(lastVals) / lastVals.length) : null },
  };
}

// Today's (or any day's) extra burn: the day's burn minus resting energy.
export const activeOf = (whole, resting) => (whole > 0 && resting > 0 ? Math.max(0, Math.round(whole - resting)) : null);
