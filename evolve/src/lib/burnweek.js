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
// from the watch that day), the total so far, and the average of the full days.
export function burnWeek({ days, sessions, today, resting }) {
  if (!(resting > 0)) return null;
  const burns = burnByDate(days, sessions);
  const from = sundayOf(today);
  const rows = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(from, i);
    const whole = date <= today ? burns.get(date) ?? null : null;
    return { date, active: whole != null ? Math.max(0, Math.round(whole - resting)) : null, today: date === today, future: date > today };
  });
  const got = rows.filter((r) => r.active != null);
  const full = got.filter((r) => !r.today);
  return {
    from, to: addDays(from, 6), rows,
    total: got.reduce((a, r) => a + r.active, 0),
    days: got.length,
    avg: full.length ? Math.round(full.reduce((a, r) => a + r.active, 0) / full.length) : null,
    today: rows.find((r) => r.today)?.active ?? null,
  };
}
