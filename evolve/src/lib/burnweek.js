// EVOLVE — burn helpers.
//
// The Shortcut link sends today's active energy plus your resting energy for
// the whole day (built into the link). This keeps that resting part, so the
// weekly report can split a day's burn into body (resting) + movement (active).
import { store } from "./api.js";

// The resting energy inside the link you pasted into the Shortcut (saved when
// you copy the link; until then, your current resting energy is the best guess).
const restKey = (uid) => `evolve_sync_rest_${uid || "me"}`;
export const linkResting = (uid) => Number(store.get(restKey(uid))) || null;
export const saveLinkResting = (uid, kcal) => { if (kcal > 0) store.set(restKey(uid), String(Math.round(kcal))); };
