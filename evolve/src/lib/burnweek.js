// EVOLVE — burn helpers.
//
// The Shortcut link sends today's active energy plus your resting energy for
// the whole day (built into the link). These keep that resting part, so a
// day's burn can be split into body (resting) + movement (active).
import { store } from "./api.js";

// The resting energy inside the link you pasted into the Shortcut (saved when
// you copy the link; until then, your current resting energy is the best guess).
const restKey = (uid) => `evolve_sync_rest_${uid || "me"}`;
export const linkResting = (uid) => Number(store.get(restKey(uid))) || null;
export const saveLinkResting = (uid, kcal) => { if (kcal > 0) store.set(restKey(uid), String(Math.round(kcal))); };

// A day's movement: the day's burn minus resting energy.
export const activeOf = (whole, resting) => (whole > 0 && resting > 0 ? Math.max(0, Math.round(whole - resting)) : null);
