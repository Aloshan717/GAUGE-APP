// EVOLVE — the weekly report and the calorie check-in.
//
// Every Sunday: a look back at the week before (Sunday … Saturday) — training
// (days, time, sets, weight moved, sets per muscle, every exercise with its
// best set and how it moved since last time, records), food (calories and
// protein against your targets), burn (body + movement), weight and InBody,
// the change from the week before and what to do next week — and a calorie
// check-in: your real burn, measured from what you ate and how your weight
// moved, and the calorie target that matches your goal. The target in use
// only changes when you tap "Apply".
import { coerceNumber, normalizeDate, mergeWeightSeries, withMuscleKg, goalStartDate } from "./core.js";
import { addDays, adaptiveMaintenance, maintenance, dailyTargets, burnByDate } from "./body.js";
import { BY_ID, MUSCLES, MUSCLE_NAMES, logExerciseId } from "./exercises.js";
import { e1rm, liftHistory, recommend, repsFor, volumeOf } from "./train.js";

const DAY = 86400000;
const t0 = (d) => new Date(`${d}T00:00:00Z`).getTime();
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
export const REPORT_DAY = 0;   // Sunday — the week runs Sunday → Saturday
export const MAX_STEP = 150;   // the most a check-in moves your target, kcal/day
export const MIN_LOGGED = 5;   // days of food logged in the week for a check-in

// The week a report covers: Sunday to Saturday, the week before the latest Sunday.
export function reportWeek(today) {
  const dow = new Date(`${today}T12:00:00Z`).getUTCDay();
  const day = addDays(today, -((dow - REPORT_DAY + 7) % 7));
  return { key: day, from: addDays(day, -7), to: addDays(day, -1) };
}
// The report n weeks before this one, and the latest n reports (newest first).
export const weekBefore = (week, n = 1) => { const key = addDays(week.key, -7 * n); return { key, from: addDays(key, -7), to: addDays(key, -1) }; };
export const pastWeeks = (today, n = 12) => Array.from({ length: n }, (_, i) => weekBefore(reportWeek(today), i));

// Same goal = same locked target. A new goal starts a new lock.
export const goalKey = (g) => (g ? [g.id, g.target_weight, g.target_body_fat, g.target_muscle_kg, g.target_date].join("|") : null);

// Weight change across the week from whatever weigh-ins / InBody you have:
// the last reading by the week's end vs the last one before the week started.
export function weekWeight(weights, scans, { from, to }) {
  const series = mergeWeightSeries(weights, scans);
  const end = [...series].reverse().find((p) => p.date <= to && p.date >= addDays(from, -3));
  const start = [...series].reverse().find((p) => p.date < from && p.date >= addDays(from, -14) && (!end || p.date < end.date));
  if (!end) return { end: null, start: null };
  if (!start) return { end, start: null };
  const days = (t0(end.date) - t0(start.date)) / DAY;
  const delta = +(end.weight - start.weight).toFixed(1);
  return { end, start, delta, perWeek: days > 0 ? +((delta / days) * 7).toFixed(2) : null };
}

export function calorieCheckin({ goal, profile = {}, body, days, sessions, weights, scans, current, to }) {
  if (!goal || !current) return { status: "no-goal" };
  const end = t0(to) + DAY - 1;
  const start = goalStartDate(goal);
  if (start && (t0(to) - t0(start)) / DAY < 13) return { status: "early" };
  const logged = (days || []).filter((r) => { const d = normalizeDate(r?.date); return d && d >= addDays(to, -6) && d <= to && coerceNumber(r.kcal_in) >= 600; }).length;
  if (logged < MIN_LOGGED) return { status: "need-food", logged };
  // Your real burn: average eaten − weight change (7,700 kcal per kg). Longer
  // windows when weigh-ins are spread out.
  let ad = null;
  for (const w of [21, 28, 35]) { ad = adaptiveMaintenance({ days, weights, scans, now: end, window: w }); if (ad) break; }
  if (!ad) return { status: "need-weight", logged };
  const blended = maintenance({ profile, body, days, sessions, weights, scans, now: end });
  const fresh = dailyTargets({ goal, body, maint: { ...blended, kcal: ad.kcal }, profile, now: end });
  if (!fresh?.kcal) return { status: "need-weight", logged };
  const change = clamp(Math.round((fresh.kcal - current) / 10) * 10, -MAX_STEP, MAX_STEP);
  const base = { burn: ad.kcal, avgIn: ad.avgIn, kgPerWeek: ad.kgPerWeek, current, logged, goalPerWeek: fresh.ratePct && body?.weight ? -(+(body.weight * fresh.ratePct / 100).toFixed(2)) : null, direction: fresh.direction };
  if (Math.abs(change) < 40) return { status: "ok", ...base, suggested: current, change: 0 };
  return { status: "adjust", ...base, suggested: current + change, change };
}

const inRange = ({ from, to }) => (d) => { const x = normalizeDate(d); return !!x && x >= from && x <= to; };
const exKey = (l) => logExerciseId(l) || `own:${String(l?.exercise || "").trim().toLowerCase()}`;
const r0 = (n) => (n == null ? null : Math.round(n));

// Training in one week: days, time, sets, weight moved, sets per muscle.
function trainingIn(data, week) {
  const inWeek = inRange(week);
  const logs = (data.logs || []).filter((l) => inWeek(l.date) && coerceNumber(l.reps) > 0);
  const sessions = (data.sessions || []).filter((s) => inWeek(s.date) && coerceNumber(s.duration_min) > 0);
  const days = [...new Set(logs.map((l) => normalizeDate(l.date)))].sort();
  const muscles = {};
  for (const l of logs) { const m = l.muscle_group || "Other"; muscles[m] = (muscles[m] || 0) + 1; }
  return {
    logs, days, workouts: days.length, sessions: sessions.length,
    minutes: sessions.reduce((a, s) => a + coerceNumber(s.duration_min), 0),
    sets: logs.length, volume: volumeOf(logs.map((l) => ({ kg: coerceNumber(l.weight_kg), reps: coerceNumber(l.reps) }))),
    muscles,
  };
}

// Food in one week: averages over the days you logged.
function foodIn(data, week, { target, proteinTarget }) {
  const inWeek = inRange(week);
  const rows = (data.days || []).filter((r) => inWeek(r.date) && coerceNumber(r.kcal_in) >= 300);
  const kcal = avg(rows.map((r) => coerceNumber(r.kcal_in)));
  const protein = avg(rows.map((r) => coerceNumber(r.protein_g) || 0));
  return {
    days: rows.length, kcal: r0(kcal), protein: r0(protein), target: target || null, proteinTarget: proteinTarget || null,
    proteinHit: proteinTarget ? rows.filter((r) => (coerceNumber(r.protein_g) || 0) >= proteinTarget * 0.9).length : null,
  };
}

// Burn in one week: the average whole day (body + movement) from the watch.
function burnIn(data, week, resting) {
  const inWeek = inRange(week);
  const vals = [...burnByDate(data.days, data.sessions).entries()].filter(([d, v]) => inWeek(d) && v > 0).map(([, v]) => v);
  if (!vals.length) return null;
  const a = Math.round(avg(vals));
  const bodyPart = resting > 0 ? Math.min(a, Math.round(resting)) : null;
  return { avg: a, days: vals.length, body: bodyPart, moving: bodyPart != null ? a - bodyPart : null };
}

// Each exercise of the week: sets, best set, heaviest weight, and the change
// from the last time before the week; what to do with it next time.
function exercisesIn(data, week, train, profile) {
  const before = (data.logs || []).filter((l) => normalizeDate(l.date) && normalizeDate(l.date) < week.from && coerceNumber(l.reps) > 0);
  const upTo = (data.logs || []).filter((l) => normalizeDate(l.date) && normalizeDate(l.date) <= week.to);
  const byKey = new Map();
  for (const l of train.logs) { const k = exKey(l); if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(l); }
  const out = [];
  for (const [k, rows] of byKey) {
    const id = k.startsWith("own:") ? null : k;
    const ex = id ? BY_ID[id] : null;
    const best = rows.reduce((a, l) => { const s = e1rm(coerceNumber(l.weight_kg), coerceNumber(l.reps)); return s > a.s ? { s, kg: coerceNumber(l.weight_kg), reps: coerceNumber(l.reps) } : a; }, { s: -1, kg: 0, reps: 0 });
    const top = Math.max(...rows.map((l) => coerceNumber(l.weight_kg) || 0));
    const prevRows = before.filter((l) => exKey(l) === k);
    const prevDate = prevRows.map((l) => normalizeDate(l.date)).sort().pop() || null;
    const prevTop = prevDate ? Math.max(...prevRows.filter((l) => normalizeDate(l.date) === prevDate).map((l) => coerceNumber(l.weight_kg) || 0)) : null;
    const prevBest = prevRows.length ? Math.max(...prevRows.map((l) => e1rm(coerceNumber(l.weight_kg), coerceNumber(l.reps)))) : null;
    // Same top weight as last time? Then the reps tell how it moved.
    const topReps = Math.max(...rows.filter((l) => (coerceNumber(l.weight_kg) || 0) === top).map((l) => coerceNumber(l.reps) || 0));
    const prevTopReps = prevDate ? Math.max(...prevRows.filter((l) => normalizeDate(l.date) === prevDate && (coerceNumber(l.weight_kg) || 0) === prevTop).map((l) => coerceNumber(l.reps) || 0)) : null;
    let next = null;
    if (ex) next = recommend(id, liftHistory(upTo, id), repsFor(ex.group, { focus: profile.focus }));
    out.push({
      key: k, id, name: ex ? ex.name : [rows[0].exercise || "?", rows[0].exercise || "?"], muscle: rows[0].muscle_group || null,
      sets: rows.length, days: new Set(rows.map((l) => normalizeDate(l.date))).size,
      best: { kg: best.kg, reps: best.reps }, top, prevTop, prevDate, change: prevTop != null ? +(top - prevTop).toFixed(2) : null,
      repsChange: prevTop != null && top === prevTop && prevTopReps != null ? topReps - prevTopReps : null,
      record: prevBest != null && best.s > prevBest + 0.01, next,
    });
  }
  const order = (m) => { const i = MUSCLES.indexOf(m); return i < 0 ? 99 : i; };
  return out.sort((a, b) => order(a.muscle) - order(b.muscle) || b.sets - a.sets);
}

// A short summary of one week, to compare with.
function summaryOf(data, week, ctx) {
  const tr = trainingIn(data, week);
  const food = foodIn(data, week, ctx);
  const burn = burnIn(data, week, ctx.resting);
  const w = weekWeight(data.weights, data.inbody, week);
  return { workouts: tr.workouts, minutes: tr.minutes, sets: tr.sets, volume: tr.volume, kcal: food.kcal, protein: food.protein, burn: burn?.avg ?? null, weight: w.end && w.end.date >= week.from ? w.end.weight : null };
}

export function weeklyReport({ week, data, profile = {}, body, current, protein, resting }) {
  const { from, to } = week;
  const ctx = { target: current, proteinTarget: protein, resting };
  const train = trainingIn(data, week);
  const exercises = exercisesIn(data, week, train, profile);
  const food = foodIn(data, week, ctx);
  const burn = burnIn(data, week, resting);
  const balance = food.days >= 3 && burn && burn.days >= 3 ? { kcal: food.kcal - burn.avg, kgPerWeek: +(((food.kcal - burn.avg) * 7) / 7700).toFixed(2) } : null;

  // InBody done this week vs the one before it.
  const scans = withMuscleKg(data.inbody || []).filter((s) => normalizeDate(s.date)).sort((a, b) => (a.date < b.date ? -1 : 1));
  const lastIdx = scans.map((s) => inRange(week)(s.date)).lastIndexOf(true);
  let inbody = null;
  if (lastIdx >= 0) {
    const s = scans[lastIdx], p = scans[lastIdx - 1];
    inbody = { date: s.date, fat: coerceNumber(s.body_fat), muscle: s.muscle_kg ?? null,
      fatDelta: p && s.body_fat != null && p.body_fat != null ? +(s.body_fat - p.body_fat).toFixed(1) : null,
      muscleDelta: p && s.muscle_kg != null && p.muscle_kg != null && s.muscle_kind === p.muscle_kind ? +(s.muscle_kg - p.muscle_kg).toFixed(1) : null };
  }

  const r = {
    from, to, key: week.key,
    weight: weekWeight(data.weights, data.inbody, week),
    food: { ...food, daily: Array.from({ length: 7 }, (_, i) => {
      const date = addDays(from, i);
      const row = (data.days || []).find((x) => normalizeDate(x.date) === date) || {};
      return { date, kcal: coerceNumber(row.kcal_in) || null, protein: coerceNumber(row.protein_g) || null, burn: burnByDate(data.days, data.sessions).get(date) || null };
    }) },
    burn, balance,
    training: { workouts: train.workouts, days: train.days, sessions: train.sessions, minutes: train.minutes, sets: train.sets, volume: train.volume, muscles: train.muscles,
      exercises, records: exercises.filter((x) => x.record).map((x) => ({ id: x.id || x.key, name: x.name, kg: x.best.kg, reps: x.best.reps })) },
    inbody,
    prev: summaryOf(data, weekBefore(week), ctx),
    checkin: calorieCheckin({ goal: data.goal, profile, body, days: data.days, sessions: data.sessions, weights: data.weights, scans: data.inbody, current, to }),
  };
  r.recs = weekRecs(r, { profile, data, week });
  return r;
}

// What to do next week, most important first: [{ k: i18n key, p: params, kind }].
// Names come as [English, Arabic] pairs; the report picks the language.
export function weekRecs(r, { profile = {}, data = {}, week } = {}) {
  const recs = [];
  const tr = r.training;
  const planned = profile.train_days?.length || data.plan?.days?.length || null;
  if (!tr.workouts) recs.push({ k: "recNoTraining", p: {}, kind: "train" });
  else if (planned && tr.workouts < planned) recs.push({ k: "recFewer", p: { w: tr.workouts, n: planned }, kind: "train" });

  if (r.food.days && r.food.proteinTarget && r.food.protein < r.food.proteinTarget * 0.9) {
    recs.push({ k: "recProtein", p: { p: r.food.protein, t: r.food.proteinTarget, g: r.food.proteinTarget - r.food.protein }, kind: "food" });
  }
  if (r.food.days >= 3 && r.food.target) {
    const d = r.food.kcal - r.food.target;
    if (d > 150) recs.push({ k: "recEatOver", p: { d }, kind: "food" });
    else if (d < -300) recs.push({ k: "recEatUnder", p: { d: -d }, kind: "food" });
  }
  if (r.food.days < MIN_LOGGED) recs.push({ k: "recLogMore", p: { n: r.food.days, m: MIN_LOGGED }, kind: "food" });

  tr.exercises.filter((x) => x.next?.kind === "up").slice(0, 2)
    .forEach((x) => recs.push({ k: "recUp", p: { name: x.name, from: x.next.from, to: x.next.weight }, kind: "up" }));
  const stall = tr.exercises.find((x) => x.next?.kind === "stall");
  if (stall) recs.push({ k: "recStall", p: { name: stall.name }, kind: "stall" });

  MUSCLES.map((m) => [m, tr.muscles[m] || 0]).filter(([m, s]) => s > 0 && s < (m === "Legs" ? 10 : 8))
    .sort((a, b) => a[1] - b[1]).slice(0, 2)
    .forEach(([m, s]) => recs.push({ k: "recSetsLow", p: { m: MUSCLE_NAMES[m] || [m, m], s }, kind: "train" }));
  if (week) {   // a muscle you train most weeks but skipped this one
    const recent = new Set((data.logs || []).filter((l) => { const d = normalizeDate(l.date); return d && d >= addDays(week.from, -21) && d < week.from; }).map((l) => l.muscle_group));
    MUSCLES.filter((m) => recent.has(m) && !tr.muscles[m]).slice(0, 1)
      .forEach((m) => recs.push({ k: "recSkipped", p: { m: MUSCLE_NAMES[m] || [m, m] }, kind: "train" }));
  }

  const pv = r.prev?.volume;
  if (pv > 0 && tr.volume > 0) {
    const pct = Math.round(((tr.volume - pv) / pv) * 100);
    if (pct <= -25) recs.push({ k: "recVolDown", p: { pct: -pct }, kind: "train" });
    else if (pct >= 10) recs.push({ k: "recVolUp", p: { pct }, kind: "good" });
  }
  if (!r.burn) recs.push({ k: "recSyncNone", p: {}, kind: "sync" });
  else if (r.burn.days < 4) recs.push({ k: "recSync", p: { n: r.burn.days }, kind: "sync" });
  if (r.food.proteinHit != null && r.food.proteinHit >= 5) recs.push({ k: "recProteinGood", p: { n: r.food.proteinHit }, kind: "good" });
  return recs.slice(0, 8);
}

// Anything to look back on this week?
export const hasContent = (r) => !!(r && (r.food.days || r.training.sets || r.weight.end && r.weight.end.date >= r.from || r.inbody));
