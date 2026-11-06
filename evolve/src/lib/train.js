// EVOLVE — training logic: today's session, lift history, next-set advice.
import { GROUPS, BY_ID, groupItems, usable, logExerciseId } from "./exercises.js";
import { coerceNumber, normalizeDate } from "./core.js";

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// Which movement groups train each muscle, most important first.
// Biceps and triceps list their group twice: two different exercises.
export const MUSCLE_ORDER = {
  Chest: ["hpress", "incline", "fly"],
  Back: ["vpull", "row", "rear"],
  Shoulders: ["ohp", "lateral", "rear"],
  Biceps: ["curl", "curl"],
  Triceps: ["triceps", "triceps"],
  Legs: ["squat", "hinge", "legpress", "legcurl", "calf", "legext"],
  Core: ["core"],
};

// About 3 sets × (set + rest) ≈ 8–9 minutes per exercise.
export const exercisesFor = (minutes) => clamp(Math.round((minutes || 60) / 8.5), 3, 9);

export function setsFor(group, { experience = "mid", focus = "muscle", first = false } = {}) {
  const g = GROUPS[group];
  if (!g) return 3;
  let sets = 3;
  if (!g.compound && experience === "new") sets = 2;
  if (g.compound && experience === "adv") sets = 4;
  if (first && g.compound && focus === "strength") sets = Math.max(sets, 4);
  return sets;
}

export function repsFor(group, { focus = "muscle", first = false } = {}) {
  const g = GROUPS[group];
  if (!g) return [8, 12];
  if (g.compound && (focus === "strength" || (focus === "mix" && first))) return g.reps.strength;
  return g.reps.muscle;
}

const setOrder = (a, b) =>
  (a.set_no ?? 99) - (b.set_no ?? 99) ||
  String(a.created_at || "").localeCompare(String(b.created_at || "")) ||
  String(a.id || "").localeCompare(String(b.id || ""));

// Every past session of one library exercise, newest first:
// [{ date, sets: [{ weight_kg, reps, effort }] }]
export function liftHistory(logs, exerciseId) {
  const by = new Map();
  for (const l of logs || []) {
    if (!l || logExerciseId(l) !== exerciseId) continue;
    const d = normalizeDate(l.date);
    const w = coerceNumber(l.weight_kg), r = coerceNumber(l.reps);
    if (!d || w == null || r == null) continue;
    if (!by.has(d)) by.set(d, []);
    by.get(d).push({ weight_kg: w, reps: r, effort: l.effort || null, set_no: l.set_no ?? null, created_at: l.created_at || null, id: l.id });
  }
  return [...by.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, sets]) => ({ date, sets: sets.sort(setOrder) }));
}

// The most recent date an exercise was logged ("" if never).
function lastDate(logs, exerciseId) {
  let best = "";
  for (const l of logs || []) if (logExerciseId(l) === exerciseId && l.date > best) best = l.date;
  return best;
}

// Pick an exercise for a group: the one you used last (so your numbers carry
// on), else the first that fits your equipment and joints.
export function pickExercise(group, logs, opts = {}, exclude = new Set(), variant = 0) {
  const options = groupItems(group).filter((e) => usable(e, opts) && !exclude.has(e.id));
  if (!options.length) return null;
  if (variant === 0) {
    const used = options.map((e) => ({ e, d: lastDate(logs, e.id) })).filter((x) => x.d).sort((a, b) => (a.d < b.d ? 1 : -1));
    if (used.length) return used[0].e.id;
  }
  // With weights available, default to loaded exercises; bodyweight ones stay one swap away.
  const loaded = options.filter((e) => !(e.equip.length === 1 && e.equip[0] === "body"));
  const pool = opts.equipment !== "bw" && loaded.length ? loaded : options;
  return pool[variant % pool.length].id;
}

// Today's session from the muscles you picked: round-robin over the muscles so
// each gets its most important movement first, sized to the time you have.
export function buildSession({ muscles = [], logs = [], profile = {}, minutes } = {}) {
  const opts = { equipment: profile.equipment || "gym", pain: profile.pain || [] };
  const experience = profile.experience || "mid";
  const focus = profile.focus || "muscle";
  const n = exercisesFor(minutes ?? profile.session_min ?? 60);
  const queues = muscles.filter((m) => MUSCLE_ORDER[m]).map((m) => ({ list: [...MUSCLE_ORDER[m]], own: new Map() }));
  const used = new Map();
  const usedEx = new Set();
  const slots = [];

  let guard = 0;
  while (slots.length < n && queues.some((q) => q.list.length) && guard++ < 50) {
    for (const q of queues) {
      if (slots.length >= n) break;
      while (q.list.length) {
        const g = q.list.shift();
        // A group already used by another muscle (rear delts for Back + Shoulders) is skipped.
        if ((used.get(g) || 0) > (q.own.get(g) || 0)) continue;
        const ex = pickExercise(g, logs, opts, usedEx);
        if (!ex) continue;
        usedEx.add(ex);
        used.set(g, (used.get(g) || 0) + 1);
        q.own.set(g, (q.own.get(g) || 0) + 1);
        slots.push({ group: g, ex });
        break;
      }
    }
  }
  // Big lifts first, while you're fresh.
  const ordered = [...slots].sort((a, b) => (GROUPS[b.group].compound ? 1 : 0) - (GROUPS[a.group].compound ? 1 : 0));
  return ordered.map((s, i) => ({
    id: `s${i}`, group: s.group, ex: s.ex,
    sets: setsFor(s.group, { experience, focus, first: i === 0 }),
    reps: repsFor(s.group, { focus, first: i === 0 }),
  }));
}

// Smallest sensible jump in load for an exercise.
export function weightStep(exerciseId, kg) {
  const ex = BY_ID[exerciseId];
  if (!ex) return 2.5;
  if (ex.equip.includes("body") && ex.equip.length === 1) return 0;   // bodyweight: progress reps
  if (ex.equip.includes("dumbbell")) return kg < 10 ? 1 : 2;
  if (["squat", "hinge", "legpress", "glutes"].includes(ex.group) && kg >= 60) return 5;
  return 2.5;
}

const top = (sess) => Math.max(...sess.sets.map((s) => s.weight_kg));
const atTop = (sess) => { const t = top(sess); return sess.sets.filter((s) => s.weight_kg === t); };
const minAtTop = (sess) => Math.min(...atTop(sess).map((s) => s.reps));
const maxAtTop = (sess) => Math.max(...atTop(sess).map((s) => s.reps));
const roundTo = (kg, step) => (step > 0 ? Math.round(kg / step) * step : Math.round(kg));

// Double progression: work up the rep range at one weight; when every set
// reaches the top of the range, add the smallest step and start again.
// Returns { kind, weight, reps } — the UI turns it into a sentence.
//   fresh: no history · up: add weight · same: add a rep · hold: same weight, reach the range
//   down: missed the range twice → lighter · stall: no progress for 3 sessions · reps: bodyweight, add reps
export function recommend(exerciseId, history, [lo, hi]) {
  const last = history?.[0];
  if (!last || !last.sets.length) return { kind: "fresh", weight: null, reps: Math.max(lo, hi - 2) };
  const w = top(last);
  const minR = minAtTop(last), maxR = maxAtTop(last);
  const step = weightStep(exerciseId, w);
  const allEasy = last.sets.every((s) => s.effort === "easy");

  if (minR >= hi) {
    if (step === 0) return { kind: "reps", weight: w, reps: hi + 2, from: w };
    return { kind: "up", weight: +(w + (allEasy ? step * 2 : step)).toFixed(2), reps: lo, from: w };
  }

  const recent = history.slice(0, 3);
  const plateau = recent.length === 3 &&
    recent.every((h) => top(h) === w) &&
    recent[0].sets.reduce((a, s) => a + s.reps, 0) <= recent[2].sets.reduce((a, s) => a + s.reps, 0);
  if (plateau) return { kind: "stall", weight: w, reps: Math.min(maxR + 1, hi), sessions: 3 };

  if (minR < lo) {
    const prev = history[1];
    if (prev && top(prev) === w && minAtTop(prev) < lo) {
      return { kind: "down", weight: Math.max(0, roundTo(w * 0.9, step || 1)), reps: Math.min(hi, lo + 2), from: w };
    }
    return { kind: "hold", weight: w, reps: lo };
  }
  return { kind: "same", weight: w, reps: Math.min(maxR + 1, hi) };
}

// "75×12 · 75×12 · 75×11"
export const setsText = (sets) => (sets || []).map((s) => `${+s.weight_kg}×${s.reps}`).join(" · ");

// Muscle groups trained most recently first, from the stored lifts.
export function lastTrained(logs, now = Date.now()) {
  const out = {};
  for (const l of logs || []) {
    const m = l?.muscle_group;
    const d = normalizeDate(l?.date);
    if (m && d && (!out[m] || d > out[m])) out[m] = d;
  }
  const days = {};
  Object.entries(out).forEach(([m, d]) => { days[m] = Math.floor((now - new Date(d + "T00:00:00Z").getTime()) / 86400000); });
  return days;
}
