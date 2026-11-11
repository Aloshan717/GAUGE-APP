// EVOLVE — training logic: today's session, lift history, next-set advice.
import { GROUPS, BY_ID, groupItems, usable, logExerciseId, canonicalId } from "./exercises.js";
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
export function liftHistory(logs, exerciseId, match) {
  const by = new Map();
  const target = canonicalId(exerciseId);
  const isIt = match || ((l) => logExerciseId(l) === target);
  for (const l of logs || []) {
    if (!l || !isIt(l)) continue;
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
  const queues = muscles.filter((m) => MUSCLE_ORDER[m]).map((m) => ({ m, list: [...MUSCLE_ORDER[m]], own: new Map() }));
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
        slots.push({ group: g, ex, muscle: q.m });
        break;
      }
    }
  }
  // Big lifts first, while you're fresh.
  const ordered = [...slots].sort((a, b) => (GROUPS[b.group].compound ? 1 : 0) - (GROUPS[a.group].compound ? 1 : 0));
  return ordered.map((s, i) => ({
    id: `s${i}`, group: s.group, ex: s.ex, muscle: s.muscle,
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

// ─── Your own numbers ───────────────────────────────────────────────────────
// The suggestion is only a starting point: you choose how many exercises per
// muscle and how many sets, and can add any exercise (or one of your own).

export const MAX_PER_MUSCLE = 6;
export const slotMuscle = (s) => s.muscle || GROUPS[s.group]?.muscle || null;

// Exercises per muscle the suggestion would give for this time.
export function recommendedCounts({ muscles = [], logs = [], profile = {}, minutes } = {}) {
  const out = Object.fromEntries(muscles.map((m) => [m, 0]));
  buildSession({ muscles, logs, profile, minutes }).forEach((s) => { out[s.muscle] = (out[s.muscle] || 0) + 1; });
  return out;
}

// Movement groups for a muscle: the usual order first, then the rest.
export function groupsFor(muscle) {
  const base = MUSCLE_ORDER[muscle] || [];
  const extra = Object.keys(GROUPS).filter((g) => GROUPS[g].muscle === muscle && !base.includes(g));
  return [...new Set([...base, ...extra])];
}

let seq = 0;
export const newSlotId = (prefix = "x") => `${prefix}${Date.now().toString(36)}${(seq++).toString(36)}`;

export function makeSlot({ group, ex, muscle, profile = {}, sets, first = false, manual = false }) {
  return {
    id: newSlotId(manual ? "m" : "a"), group, ex, origEx: ex, muscle: muscle || GROUPS[group]?.muscle, manual,
    sets: sets ?? setsFor(group, { experience: profile.experience, focus: profile.focus, first }),
    reps: repsFor(group, { focus: profile.focus, first }),
  };
}

// Your own exercise, not in the library. History is matched by its name.
export function makeCustomSlot({ name, muscle, sets = 3, parts }) {
  return { id: newSlotId("c"), custom: true, manual: true, name: String(name).trim(), muscle, group: null, ex: null, sets, reps: [8, 12], ...(parts?.length ? { parts } : null) };
}
export const customMatch = (name) => {
  const k = String(name || "").trim().toLowerCase();
  return (l) => String(l?.exercise || "").trim().toLowerCase() === k;
};

// Re-shape a session to the counts you set: keeps the exercises already there
// (with their swaps, their own number of sets and logged sets), adds or drops
// from the end per muscle. New exercises get `sets` if you set one for every
// exercise. Exercises you added yourself are never touched.
export function adjustSession(slots = [], { muscles = [], counts = {}, sets = null, logs = [], profile = {} } = {}) {
  const opts = { equipment: profile.equipment || "gym", pain: profile.pain || [] };
  const manual = slots.filter((s) => s.manual);
  const kept = [];
  for (const m of muscles) {
    const want = Math.max(0, Math.min(MAX_PER_MUSCLE, counts[m] ?? 0));
    kept.push(...slots.filter((s) => !s.manual && slotMuscle(s) === m).slice(0, want).map((s) => ({ ...s, muscle: m })));
  }
  const used = new Set([...kept, ...manual].map((s) => s.ex).filter(Boolean));
  const out = [...kept];
  for (const m of muscles) {
    const want = Math.max(0, Math.min(MAX_PER_MUSCLE, counts[m] ?? 0));
    const groups = groupsFor(m);
    let have = out.filter((s) => slotMuscle(s) === m).length, i = have, tries = 0;
    while (have < want && tries++ < 40) {
      const g = groups[i % groups.length];
      i++;
      const ex = pickExercise(g, logs, opts, used);
      if (!ex) continue;
      used.add(ex);
      out.push(makeSlot({ group: g, ex, muscle: m, profile, sets: sets || undefined }));
      have++;
    }
  }
  // Big lifts first, then the exercises you added.
  const ordered = out.sort((a, b) => (GROUPS[b.group]?.compound ? 1 : 0) - (GROUPS[a.group]?.compound ? 1 : 0));
  return [...ordered, ...manual];
}

export const MAX_SETS = 12;

// One number of sets for every exercise — never fewer than the sets already saved.
export function setAllSets(slots = [], n, done = {}) {
  return slots.map((s) => ({ ...s, sets: Math.max(n, (done[s.id] || []).length) }));
}

// The suggested sets for each exercise (as when it was added).
export function suggestedSets(slots = [], profile = {}, done = {}) {
  return slots.map((s) => (s.custom ? s : {
    ...s, sets: Math.max((done[s.id] || []).length, setsFor(s.group, { experience: profile.experience, focus: profile.focus })),
  }));
}

// ─── Same as last time ──────────────────────────────────────────────────────
// Your past workouts, newest first: one per day, the exercises in the order
// you did them and how many sets you logged — so a session can be repeated.
//   [{ date, muscles: [...], items: [{ id, name, muscle, sets }] }]
export function pastWorkouts(logs, { before } = {}) {
  const days = new Map();
  for (const l of logs || []) {
    const d = normalizeDate(l?.date);
    if (!d || (before && d >= before)) continue;
    const id = logExerciseId(l);
    const name = String(l.exercise || "").trim();
    if (!id && !name) continue;
    const key = id || `name:${name.toLowerCase()}`;
    if (!days.has(d)) days.set(d, new Map());
    const day = days.get(d);
    const when = String(l.created_at || "");
    if (!day.has(key)) {
      day.set(key, { id, name: id ? BY_ID[id].name[0] : name, muscle: l.muscle_group || (id ? GROUPS[BY_ID[id].group].muscle : null), sets: 0, first: when, ref: String(l.id || "") });
    }
    const e = day.get(key);
    e.sets += 1;
    if (when && (!e.first || when < e.first)) e.first = when;
  }
  return [...days.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, day]) => {
      const items = [...day.values()]
        .sort((a, b) => a.first.localeCompare(b.first) || a.ref.localeCompare(b.ref))
        .map(({ id, name, muscle, sets }) => ({ id, name, muscle, sets }));
      return { date, items, muscles: [...new Set(items.map((i) => i.muscle).filter(Boolean))] };
    });
}

// The exercises from the last time you trained this muscle (or null).
export function lastTimeFor(muscle, workouts) {
  for (const w of workouts || []) {
    const items = w.items.filter((i) => i.muscle === muscle);
    if (items.length) return { date: w.date, items };
  }
  return null;
}

// Session slots from a past workout's exercises, with the sets you did.
// `mine(name)` finds the details (parts, photo) of an exercise you added yourself.
export function slotsFromItems(items = [], { profile = {}, muscle, mine } = {}) {
  return items.map((i) => {
    const sets = Math.max(1, Math.min(MAX_SETS, i.sets || 3));
    const m = muscle || i.muscle;
    if (i.id && BY_ID[i.id]) {
      const g = BY_ID[i.id].group;
      return { ...makeSlot({ group: g, ex: i.id, muscle: m || GROUPS[g].muscle, profile, sets }), fromLast: true };
    }
    const own = mine?.(i.name);
    return { ...makeCustomSlot({ name: i.name, muscle: m || own?.muscle || "Chest", sets, parts: own?.parts }), fromLast: true };
  });
}

// Same exercise already in the list (library id, or your own by name)?
export const sameExercise = (a, b) => (a.ex && a.ex === b.ex) || (!!a.custom && !!b.custom && a.name.toLowerCase() === b.name.toLowerCase());

// ─── Records ────────────────────────────────────────────────────────────────
// Estimated one-rep max (Epley), capped at 12 reps where it stays sensible.
export const e1rm = (w, r) => (w > 0 && r > 0 ? w * (1 + Math.min(r, 12) / 30) : 0);

// Your best before today for one exercise (from liftHistory, today left out).
export function bestOf(history) {
  let weight = 0, oneRm = 0, reps = 0, any = false;
  for (const h of history || []) {
    for (const s of h.sets || []) {
      any = true;
      weight = Math.max(weight, s.weight_kg || 0);
      oneRm = Math.max(oneRm, e1rm(s.weight_kg, s.reps));
      if (!(s.weight_kg > 0)) reps = Math.max(reps, s.reps || 0);
    }
  }
  return any ? { weight, oneRm, reps } : null;
}

// Does a set beat those bests? "weight" (heaviest ever), "e1rm" (more reps at a
// weight = stronger), "reps" (bodyweight) — or null. The first time is not a record.
export function recordKind(set, best) {
  if (!best || !set) return null;
  const w = set.kg ?? set.weight_kg ?? 0, r = set.reps || 0;
  if (w > 0 && w > best.weight) return "weight";
  if (w > 0 && e1rm(w, r) > best.oneRm + 0.01) return "e1rm";
  if (!(w > 0) && best.reps > 0 && r > best.reps) return "reps";
  return null;
}

// The one set today that is the record (the strongest of those that beat your best).
export function recordIndex(done, best) {
  let at = -1, top = 0;
  (done || []).forEach((d, i) => {
    if (!d || !recordKind(d, best)) return;
    const score = d.kg > 0 ? e1rm(d.kg, d.reps) : d.reps;
    if (score > top) { top = score; at = i; }
  });
  return at;
}

// Total weight moved: Σ kg × reps (bodyweight sets add nothing).
export const volumeOf = (sets) => Math.round((sets || []).reduce((a, s) => a + (s && (s.kg ?? s.weight_kg) > 0 ? (s.kg ?? s.weight_kg) * (s.reps || 0) : 0), 0));

// Rest between sets: big lifts 2 min (3 for strength), small ones 1:30 — or what you set.
export function restSeconds({ compound, focus, saved }) {
  if (saved > 0) return saved;
  return compound ? (focus === "strength" ? 180 : 120) : 90;
}
