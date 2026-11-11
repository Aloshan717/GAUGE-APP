// EVOLVE — the weekly report and the calorie check-in.
//
// Every Saturday: a look back at the 7 days before (Sat … Fri) — weight change,
// how much you ate and how many days you logged, burn, workouts and records,
// InBody — and a calorie check-in: your real burn, measured from what you ate
// and how your weight moved, and the calorie target that matches your goal.
// The target in use only changes when you tap "Apply".
import { coerceNumber, normalizeDate, mergeWeightSeries, withMuscleKg, goalStartDate } from "./core.js";
import { addDays, adaptiveMaintenance, maintenance, dailyTargets, burnByDate } from "./body.js";
import { BY_ID } from "./exercises.js";
import { logExerciseId } from "./exercises.js";
import { e1rm } from "./train.js";

const DAY = 86400000;
const t0 = (d) => new Date(`${d}T00:00:00Z`).getTime();
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
export const REPORT_DAY = 6;   // Saturday
export const MAX_STEP = 150;   // the most a check-in moves your target, kcal/day
export const MIN_LOGGED = 5;   // days of food logged in the week for a check-in

// The week a report covers: the 7 days before the latest Saturday.
export function reportWeek(today) {
  const dow = new Date(`${today}T12:00:00Z`).getUTCDay();
  const day = addDays(today, -((dow - REPORT_DAY + 7) % 7));
  return { key: day, from: addDays(day, -7), to: addDays(day, -1) };
}

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

export function weeklyReport({ week, data, profile = {}, body, current, protein }) {
  const { from, to } = week;
  const inWeek = (d) => { const x = normalizeDate(d); return x && x >= from && x <= to; };

  const food = (data.days || []).filter((r) => inWeek(r.date) && coerceNumber(r.kcal_in) >= 300);
  const burns = [...burnByDate(data.days, data.sessions).entries()].filter(([d]) => inWeek(d)).map(([, v]) => v);
  const logs = (data.logs || []).filter((l) => inWeek(l.date));

  // Records: this week's best set per exercise against everything before the week.
  const records = [];
  const ids = [...new Set(logs.map((l) => logExerciseId(l)).filter(Boolean))];
  for (const id of ids) {
    const before = (data.logs || []).filter((l) => logExerciseId(l) === id && normalizeDate(l.date) < from);
    if (!before.length) continue;
    const best = Math.max(...before.map((l) => e1rm(coerceNumber(l.weight_kg), coerceNumber(l.reps))));
    const top = logs.filter((l) => logExerciseId(l) === id).reduce((a, l) => {
      const s = e1rm(coerceNumber(l.weight_kg), coerceNumber(l.reps));
      return s > a.s ? { s, l } : a;
    }, { s: 0, l: null });
    if (top.l && top.s > best + 0.01) records.push({ id, name: BY_ID[id]?.name, kg: coerceNumber(top.l.weight_kg), reps: coerceNumber(top.l.reps) });
  }

  // InBody done this week vs the one before it.
  const scans = withMuscleKg(data.inbody || []).filter((s) => normalizeDate(s.date)).sort((a, b) => (a.date < b.date ? -1 : 1));
  const lastIdx = scans.map((s) => inWeek(s.date)).lastIndexOf(true);
  let inbody = null;
  if (lastIdx >= 0) {
    const s = scans[lastIdx], p = scans[lastIdx - 1];
    inbody = { date: s.date, fat: coerceNumber(s.body_fat), muscle: s.muscle_kg ?? null,
      fatDelta: p && s.body_fat != null && p.body_fat != null ? +(s.body_fat - p.body_fat).toFixed(1) : null,
      muscleDelta: p && s.muscle_kg != null && p.muscle_kg != null && s.muscle_kind === p.muscle_kind ? +(s.muscle_kg - p.muscle_kg).toFixed(1) : null };
  }

  return {
    from, to, key: week.key,
    weight: weekWeight(data.weights, data.inbody, week),
    food: { days: food.length, kcal: avg(food.map((r) => coerceNumber(r.kcal_in))), protein: avg(food.map((r) => coerceNumber(r.protein_g) || 0)), target: current, proteinTarget: protein },
    burn: burns.length ? { avg: Math.round(avg(burns)), days: burns.length } : null,
    training: { workouts: new Set(logs.map((l) => normalizeDate(l.date))).size, sets: logs.length, records },
    inbody,
    checkin: calorieCheckin({ goal: data.goal, profile, body, days: data.days, sessions: data.sessions, weights: data.weights, scans: data.inbody, current, to }),
  };
}

// Anything to look back on this week?
export const hasContent = (r) => !!(r && (r.food.days || r.training.sets || r.weight.end && r.weight.end.date >= r.from || r.inbody));
