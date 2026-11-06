// EVOLVE — weekly training plan from the plan-builder answers.
import { GROUPS } from "./exercises.js";
import { pickExercise, setsFor, repsFor } from "./train.js";

// Second and third days of a split use other exercises for variety (variant 1, 2);
// the first follows what you've been doing.
// Each slot lists groups in order of preference: the first one that has an
// exercise you can do (equipment, joints) is used.
const T = {
  fullA:  { name: ["Full body A", "جسم كامل A"], slots: [["squat", "legpress", "lunge"], ["hpress"], ["row"], ["ohp", "incline"], ["legcurl", "hinge"], ["curl"], ["core"]] },
  fullB:  { name: ["Full body B", "جسم كامل B"], slots: [["hinge", "glutes"], ["incline", "hpress"], ["vpull", "row"], ["lunge", "squat"], ["lateral"], ["triceps"], ["calf"]] },
  fullC:  { name: ["Full body C", "جسم كامل C"], slots: [["legpress", "squat", "lunge"], ["hpress"], ["vpull", "row"], ["glutes", "hinge"], ["rear", "lateral"], ["curl"], ["triceps"]] },
  upperA: { name: ["Upper A", "علوي A"], slots: [["hpress"], ["row"], ["ohp", "incline"], ["vpull", "row"], ["triceps"], ["curl"], ["lateral"]] },
  upperB: { name: ["Upper B", "علوي B"], slots: [["incline", "hpress"], ["vpull", "row"], ["row"], ["lateral"], ["fly", "hpress"], ["curl"], ["triceps"], ["rear"]] },
  lowerA: { name: ["Lower A", "سفلي A"], slots: [["squat", "legpress", "lunge"], ["hinge", "glutes"], ["legcurl", "hinge"], ["legext", "lunge"], ["calf"], ["core"]] },
  lowerB: { name: ["Lower B", "سفلي B"], slots: [["legpress", "squat", "lunge"], ["lunge", "squat"], ["glutes", "hinge"], ["legcurl", "hinge"], ["calf"], ["core"]] },
  push:   { name: ["Push", "دفع"], slots: [["hpress"], ["ohp", "incline"], ["incline", "hpress"], ["lateral"], ["fly", "hpress"], ["triceps"], ["triceps"]] },
  pull:   { name: ["Pull", "سحب"], slots: [["vpull", "row"], ["row"], ["vpull", "row"], ["rear", "lateral"], ["curl"], ["curl"], ["core"]] },
  legs:   { name: ["Legs", "رجل"], slots: [["squat", "legpress", "lunge"], ["hinge", "glutes"], ["legpress", "lunge", "squat"], ["legcurl", "hinge"], ["legext", "lunge"], ["calf"], ["core"]] },
};

export const SPLITS = {
  2: { key: "full2", name: ["Full body ×2", "جسم كامل ×2"], days: [["fullA", 0], ["fullB", 1]] },
  3: { key: "full3", name: ["Full body ×3", "جسم كامل ×3"], days: [["fullA", 0], ["fullB", 1], ["fullC", 2]] },
  4: { key: "upper_lower", name: ["Upper / Lower", "علوي / سفلي"], days: [["upperA", 0], ["lowerA", 0], ["upperB", 1], ["lowerB", 1]] },
  5: { key: "ul_ppl", name: ["Upper / Lower + Push / Pull / Legs", "علوي / سفلي + دفع / سحب / رجل"], days: [["upperA", 0], ["lowerA", 0], ["push", 1], ["pull", 1], ["legs", 1]] },
  6: { key: "ppl2", name: ["Push / Pull / Legs ×2", "دفع / سحب / رجل ×2"], days: [["push", 0], ["pull", 0], ["legs", 0], ["push", 1], ["pull", 1], ["legs", 1]] },
};

// Training days spread through the week (0 = Sunday). Friday stays free.
export const DEFAULT_DAYS = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [6, 0, 1, 3, 4], 6: [6, 0, 1, 2, 3, 4] };
export const WEEKDAYS = [["Sun", "الأحد"], ["Mon", "الإثنين"], ["Tue", "الثلاثاء"], ["Wed", "الأربعاء"], ["Thu", "الخميس"], ["Fri", "الجمعة"], ["Sat", "السبت"]];
export const WEEKDAYS_FULL = [["Sunday", "الأحد"], ["Monday", "الإثنين"], ["Tuesday", "الثلاثاء"], ["Wednesday", "الأربعاء"], ["Thursday", "الخميس"], ["Friday", "الجمعة"], ["Saturday", "السبت"]];

export const splitFor = (count) => SPLITS[Math.max(2, Math.min(6, count || 4))];

// Minutes a slot takes: sets × (work + rest) plus moving between stations.
// Big lifts rest ~2–3 min, small ones ~1–1.5 min.
export const slotMinutes = (sets, compound) => sets * (compound ? 2.75 : 1.75) + 1;

// Answers → plan. Pure, so the same answers always give the same plan.
export function generatePlan(answers = {}, logs = []) {
  const days = [...new Set((answers.train_days?.length ? answers.train_days : DEFAULT_DAYS[4]))].sort((a, b) => a - b).slice(0, 6);
  const split = splitFor(days.length);
  const opts = { equipment: answers.equipment || "gym", pain: answers.pain || [] };
  const minutes = answers.session_min || 60;
  const experience = answers.experience || "mid";
  const focus = answers.focus || "muscle";
  const budget = Math.max(20, minutes - 5);   // 5 min warm-up

  const planDays = split.days.map(([tpl, variant], di) => {
    const t = T[tpl];
    const usedEx = new Set();
    let slots = [];
    t.slots.forEach((choices) => {
      for (const g of choices) {
        const ex = pickExercise(g, logs, opts, usedEx, variant);
        if (!ex) continue;
        usedEx.add(ex);
        slots.push({ group: g, ex });
        return;
      }
    });
    slots = slots.map((s, i) => ({
      ...s,
      sets: setsFor(s.group, { experience, focus, first: i === 0 }),
      reps: repsFor(s.group, { focus, first: i === 0 }),
    }));
    // Fit the time: first trim small exercises to 2 sets (from the end), then
    // drop the least important slots. Always keep at least 3 exercises.
    const total = () => slots.reduce((a, s) => a + slotMinutes(s.sets, GROUPS[s.group].compound), 0);
    while (total() > budget) {
      const trim = [...slots].reverse().find((s) => !GROUPS[s.group].compound && s.sets > 2);
      if (trim) { trim.sets -= 1; continue; }
      if (slots.length <= 3) break;
      slots.pop();
    }
    return {
      weekday: days[di],
      key: `${tpl}${variant ? "2" : ""}`,
      name: t.name,
      slots: slots.map((s, i) => ({ id: `d${di}s${i}`, group: s.group, ex: s.ex, sets: s.sets, reps: s.reps, kept: false })),
    };
  });

  return {
    version: 1,
    split: split.key,
    splitName: split.name,
    minutes,
    cardio: answers.cardio || "none",
    days: planDays,
  };
}

// Hard sets per week for the big muscle areas, as "min–max".
const AREAS = {
  chest: ["hpress", "incline", "fly"], back: ["row", "vpull"], shoulders: ["ohp", "lateral", "rear"],
  quads: ["squat", "legpress", "lunge", "legext"], hams: ["hinge", "legcurl", "glutes"], arms: ["curl", "triceps"],
};
export function weeklySets(plan) {
  const totals = Object.fromEntries(Object.keys(AREAS).map((k) => [k, 0]));
  (plan?.days || []).forEach((d) => d.slots.forEach((s) => {
    Object.entries(AREAS).forEach(([k, groups]) => { if (groups.includes(s.group)) totals[k] += s.sets; });
  }));
  const vals = Object.values(totals).filter((v) => v > 0);
  return vals.length ? { min: Math.min(...vals), max: Math.max(...vals), totals } : null;
}

// Which plan day is today (or null on a rest day).
export function planDayFor(plan, date = new Date()) {
  const wd = date.getDay();
  return (plan?.days || []).find((d) => d.weekday === wd) || null;
}

// The next plan day after today.
export function nextPlanDay(plan, date = new Date()) {
  const days = plan?.days || [];
  if (!days.length) return null;
  const wd = date.getDay();
  for (let i = 1; i <= 7; i++) {
    const d = days.find((x) => x.weekday === (wd + i) % 7);
    if (d) return { day: d, inDays: i };
  }
  return null;
}

// Replace one slot's exercise (a swap), marking it reviewed.
export function swapInPlan(plan, slotId, exId) {
  return {
    ...plan,
    days: plan.days.map((d) => ({ ...d, slots: d.slots.map((s) => (s.id === slotId ? { ...s, ex: exId, kept: true } : s)) })),
  };
}

export function toggleKept(plan, slotId) {
  return {
    ...plan,
    days: plan.days.map((d) => ({ ...d, slots: d.slots.map((s) => (s.id === slotId ? { ...s, kept: !s.kept } : s)) })),
  };
}

export function reviewCount(plan) {
  let total = 0, kept = 0;
  (plan?.days || []).forEach((d) => d.slots.forEach((s) => { total++; if (s.kept) kept++; }));
  return { total, kept };
}
