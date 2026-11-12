// Evolve logic tests: library, swaps, sessions, advice, plan, energy, goal checks.
import assert from "node:assert/strict";
import { EXERCISES, BY_ID, GROUPS, usable, swapOptions, matchExercise, logExerciseId } from "../src/lib/exercises.js";
import { buildSession, recommend, liftHistory, weightStep, exercisesFor, adjustSession, recommendedCounts, makeCustomSlot, customMatch, makeSlot, setAllSets, suggestedSets,
  pastWorkouts, lastTimeFor, slotsFromItems, sameExercise, coverage } from "../src/lib/train.js";
import { generatePlan, weeklySets, swapInPlan, toggleKept, setSlotSets, reviewCount, planDayFor, nextPlanDay, DEFAULT_DAYS } from "../src/lib/plan.js";
import { musclesOf, slotMuscles, regionLevels, REGIONS, MUSCLE_LABELS, PARTS, mainView, focusBox, searchExercises, customMuscles, sameAngle } from "../src/lib/muscles.js";
import { FRONT, BACK } from "../src/lib/bodymap.js";
import { e1rm, bestOf, recordKind, recordIndex, volumeOf, restSeconds } from "../src/lib/train.js";
import { reportWeek, weekWeight, calorieCheckin, weeklyReport, goalKey, MAX_STEP, pastWeeks, weekBefore } from "../src/lib/weekly.js";
import { remapDone } from "../src/lib/queue.js";
import { dayRows, lastSeven } from "../src/lib/foodlog.js";
import { primeSound, scheduleBeep, cancelBeep } from "../src/lib/sound.js";
import { restingEnergy, formulaMaintenance, maintenance, dailyTargets, goalDirection, feasibility, consistency, currentBody, adaptiveMaintenance, watchAverage, coachTips, localISO,
  dayTarget, liveAdjust, kcalFloor } from "../src/lib/body.js";
import burnHandler, { toKcal, localDate } from "../api/burn.js";
import { STR, makeT, burnLine } from "../src/lib/i18n.js";
import { reportDoc, docText } from "../src/lib/reportdoc.js";
import { pdfBytes } from "../src/lib/pdf.js";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

let passed = 0, failed = 0;
const pending = [];
const fail = (name, e) => { failed++; console.error(`✗ ${name}\n   ${e.stack?.split("\n").slice(0, 3).join("\n   ")}`); };
const test = (name, fn) => {
  try {
    const r = fn();
    if (r && typeof r.then === "function") pending.push(r.then(() => { passed++; }, (e) => fail(name, e)));
    else passed++;
  } catch (e) { fail(name, e); }
};
const NOW = Date.UTC(2026, 10, 6);
const day = (n) => new Date(NOW + n * 86400000).toISOString().slice(0, 10);

// ── Library and swaps ──
test("every exercise belongs to a known group and has names in both languages", () => {
  for (const e of EXERCISES) { assert.ok(GROUPS[e.group], e.id); assert.equal(e.name.length, 2); assert.ok(e.name[1]); }
});
test("swap offers only the same group (same movement + main muscle)", () => {
  const opts = swapOptions("bench_press", { equipment: "gym" });
  assert.ok(opts.length >= 3);
  assert.ok(opts.every((e) => e.group === "hpress"));
  assert.ok(!opts.some((e) => e.id === "bench_press"));
});
test("swap respects equipment and sore joints", () => {
  const home = swapOptions("bench_press", { equipment: "home" });
  assert.ok(home.every((e) => usable(e, { equipment: "home" })));
  assert.ok(!home.some((e) => e.equip.includes("machine") || e.equip.includes("barbell")));
  const shoulder = swapOptions("machine_chest_press", { equipment: "gym", pain: ["shoulder"] });
  assert.ok(!shoulder.some((e) => e.loads.includes("shoulder")));
});
test("swap lists same-movement options before different angles, and skips today's exercises", () => {
  const opts = swapOptions("rope_pushdown", { equipment: "gym", exclude: ["skull_crusher"] });
  const firstAngle = opts.findIndex((e) => e.tag === "angle");
  assert.ok(opts.slice(firstAngle).every((e) => e.tag === "angle"));
  assert.ok(!opts.some((e) => e.id === "skull_crusher"));
});
test("Gauge lift names match the library", () => {
  assert.equal(matchExercise("Bench Press"), "bench_press");
  assert.equal(matchExercise("lat pulldown"), "lat_pulldown");
  assert.equal(matchExercise("Leg Press"), "leg_press");
  assert.equal(matchExercise("Something odd"), null);
  assert.equal(logExerciseId({ exercise: "x", exercise_id: "db_curl" }), "db_curl");
});

// ── Session ──
test("a chest + triceps session starts with a press and works every triceps head", () => {
  const s = buildSession({ muscles: ["Chest", "Triceps"], minutes: 60 });
  assert.equal(s[0].group, "hpress");
  const tri = s.filter((x) => x.group === "triceps");
  assert.equal(tri.length, 3);
  assert.deepEqual(tri.map((x) => musclesOf(x.ex).primary[0]).sort(), ["tricepsLateral", "tricepsLong", "tricepsMedial"]);
  assert.equal(new Set(s.map((x) => x.ex)).size, s.length);
});
test("session size follows the time you have", () => {
  assert.ok(buildSession({ muscles: ["Legs", "Back", "Chest"], minutes: 45 }).length <= exercisesFor(45));
  assert.ok(buildSession({ muscles: ["Legs", "Back", "Chest"], minutes: 90 }).length > buildSession({ muscles: ["Legs", "Back", "Chest"], minutes: 45 }).length);
});
test("rear delts are not repeated when Back and Shoulders are both picked", () => {
  const s = buildSession({ muscles: ["Back", "Shoulders"], minutes: 90 });
  assert.ok(s.filter((x) => x.group === "rear").length <= 1);
});
test("session keeps the exercise you used last time for that movement", () => {
  const logs = [{ exercise: "Dumbbell bench press", muscle_group: "Chest", weight_kg: 30, reps: 10, date: day(-3) }];
  const s = buildSession({ muscles: ["Chest"], logs, minutes: 60 });
  assert.equal(s.find((x) => x.group === "hpress").ex, "db_bench_press");
});
test("home session uses only home equipment", () => {
  const s = buildSession({ muscles: ["Chest", "Back", "Legs"], profile: { equipment: "home" }, minutes: 60 });
  assert.ok(s.length >= 3);
  assert.ok(s.every((x) => usable(BY_ID[x.ex], { equipment: "home" })));
});

// ── Advice (double progression) ──
const hist = (...sessions) => sessions.map(([date, sets]) => ({ date, sets: sets.map(([w, r, effort]) => ({ weight_kg: w, reps: r, effort })) }));
test("all sets at the top of the range → add the smallest step", () => {
  const r = recommend("bench_press", hist([day(-3), [[75, 12], [75, 12], [75, 12]]]), [8, 12]);
  assert.equal(r.kind, "up"); assert.equal(r.weight, 77.5); assert.equal(r.reps, 8);
});
test("easy sets at the top → bigger jump", () => {
  const r = recommend("bench_press", hist([day(-3), [[75, 12, "easy"], [75, 12, "easy"], [75, 12, "easy"]]]), [8, 12]);
  assert.equal(r.weight, 80);
});
test("inside the range → same weight, one more rep", () => {
  const r = recommend("incline_db_press", hist([day(-3), [[30, 10], [30, 10], [30, 9]]]), [8, 12]);
  assert.equal(r.kind, "same"); assert.equal(r.weight, 30); assert.equal(r.reps, 11);
});
test("below the range twice → lighter", () => {
  const r = recommend("bench_press", hist([day(-3), [[80, 6], [80, 5]]], [day(-7), [[80, 6], [80, 6]]]), [8, 12]);
  assert.equal(r.kind, "down"); assert.ok(r.weight < 80);
});
test("no progress three sessions running → plateau", () => {
  const r = recommend("cable_fly", hist([day(-2), [[20, 12], [20, 12]]], [day(-5), [[20, 12], [20, 12]]], [day(-9), [[20, 12], [20, 12]]]), [12, 15]);
  assert.equal(r.kind, "stall");
});
test("bodyweight exercise progresses reps, not load", () => {
  const r = recommend("push_up", hist([day(-2), [[0, 15], [0, 15]]]), [8, 15]);
  assert.equal(r.kind, "reps"); assert.equal(weightStep("push_up", 0), 0);
});
test("lift history groups sets by day, newest first", () => {
  const logs = [
    { exercise: "Bench Press", weight_kg: 70, reps: 10, date: day(-10) },
    { exercise_id: "bench_press", exercise: "Bench press", weight_kg: 75, reps: 12, date: day(-3), set_no: 2 },
    { exercise_id: "bench_press", exercise: "Bench press", weight_kg: 75, reps: 12, date: day(-3), set_no: 1 },
  ];
  const h = liftHistory(logs, "bench_press");
  assert.equal(h.length, 2); assert.equal(h[0].date, day(-3)); assert.equal(h[0].sets.length, 2);
});

// ── Plan ──
test("4 days → upper/lower, each day fits the time, one exercise per slot", () => {
  const p = generatePlan({ train_days: [0, 1, 3, 4], session_min: 60 });
  assert.equal(p.split, "upper_lower"); assert.equal(p.days.length, 4);
  for (const d of p.days) {
    assert.ok(d.slots.length >= 3);
    assert.equal(new Set(d.slots.map((s) => s.ex)).size, d.slots.length);
  }
});
test("every split size builds, with training on the chosen weekdays", () => {
  for (const n of [2, 3, 4, 5, 6]) {
    const p = generatePlan({ train_days: DEFAULT_DAYS[n] });
    assert.equal(p.days.length, n);
    assert.deepEqual(p.days.map((d) => d.weekday), [...DEFAULT_DAYS[n]].sort((a, b) => a - b));
  }
});
test("shorter sessions get fewer exercises", () => {
  const short = generatePlan({ train_days: [0, 1, 3, 4], session_min: 45 });
  const long = generatePlan({ train_days: [0, 1, 3, 4], session_min: 90 });
  assert.ok(short.days[0].slots.length < long.days[0].slots.length);
});
test("bodyweight-only plan uses only bodyweight exercises", () => {
  const p = generatePlan({ train_days: [0, 2, 4], equipment: "bw" });
  p.days.forEach((d) => d.slots.forEach((s) => assert.ok(usable(BY_ID[s.ex], { equipment: "bw" }), s.ex)));
});
test("knee pain leaves out exercises that load the knee", () => {
  const p = generatePlan({ train_days: [0, 1, 3, 4], pain: ["knee"] });
  p.days.forEach((d) => d.slots.forEach((s) => assert.ok(!BY_ID[s.ex].loads.includes("knee"), s.ex)));
});
test("review: swap marks the slot reviewed; keep toggles", () => {
  let p = generatePlan({ train_days: [0, 1, 3, 4] });
  const slot = p.days[0].slots[0];
  const alt = swapOptions(slot.ex, {})[0];
  p = swapInPlan(p, slot.id, alt.id);
  assert.equal(p.days[0].slots[0].ex, alt.id); assert.equal(p.days[0].slots[0].kept, true);
  p = toggleKept(p, p.days[0].slots[1].id);
  assert.equal(reviewCount(p).kept, 2);
});
test("weekly sets per muscle area are in the evidence range for 4 days", () => {
  const w = weeklySets(generatePlan({ train_days: [0, 1, 3, 4], session_min: 60 }));
  assert.ok(w.min >= 4 && w.max <= 20, JSON.stringify(w));
});
test("today's and next plan day", () => {
  const p = generatePlan({ train_days: [0, 1, 3, 4] });
  const sunday = new Date(2026, 10, 8);   // a Sunday
  assert.equal(planDayFor(p, sunday).weekday, 0);
  assert.equal(planDayFor(p, new Date(2026, 10, 10)), null);   // Tuesday rest
  assert.equal(nextPlanDay(p, new Date(2026, 10, 10)).day.weekday, 3);
});

// ── Energy and targets ──
test("resting energy: Katch–McArdle with FFM, Mifflin without", () => {
  assert.equal(restingEnergy({ ffm: 67.6 }).kcal, Math.round(370 + 21.6 * 67.6));
  assert.equal(restingEnergy({ weight: 85, heightCm: 178, age: 34, sex: "m" }).method, "mifflin");
  assert.equal(restingEnergy({ weight: 85 }), null);
});
const scans = [
  { date: day(-60), weight: 86.4, body_fat: 21.6, smm_kg: 63.6, muscle_mass: 73.6 },
  { date: day(-4), weight: 85.15, body_fat: 20.7, smm_kg: 64.0, muscle_mass: 75.2 },
];
const weights = Array.from({ length: 22 }, (_, i) => ({ date: day(-21 + i), weight: +(85.9 - i * 0.04).toFixed(2) }));
const body = currentBody({ weights, scans });
test("current body uses the latest weigh-in and the scan's fat-free mass", () => {
  assert.equal(body.weight, weights[weights.length - 1].weight);
  assert.ok(Math.abs(body.ffm - 85.15 * 0.793) < 0.2);
  assert.equal(body.muscleKg, 64);
});
test("watch average needs at least 4 days", () => {
  assert.equal(watchAverage([{ date: day(-1), burn_kcal: 2800 }], [], NOW), null);
  const w = watchAverage([1, 2, 3, 4].map((n) => ({ date: day(-n), burn_kcal: 2800 })), [], NOW);
  assert.equal(w.avg, 2800);
});
test("adaptive maintenance = intake − weight change", () => {
  const days = Array.from({ length: 14 }, (_, i) => ({ date: day(-i), kcal_in: 2300 }));
  const a = adaptiveMaintenance({ days, weights, scans: [], now: NOW });
  assert.ok(a && a.kgPerWeek < 0);
  assert.ok(a.kcal > 2300);   // losing on 2,300 → burning more than that
});
const goal = { target_weight: 84, target_body_fat: 18.5, target_muscle_kg: 65, target_date: day(58), start_date: day(-30) };
test("goal direction: lower weight → lose", () => {
  assert.equal(goalDirection(goal, body), "lose");
  assert.equal(goalDirection({ target_weight: 90 }, body), "gain");
  assert.equal(goalDirection({ target_weight: body.weight, target_body_fat: 17 }, body), "recomp");
});
test("daily targets: deficit from the weekly rate, protein from fat-free mass", () => {
  const t = dailyTargets({ goal, body, maint: { kcal: 2810, bmr: { kcal: 1830 } }, profile: { sex: "m" }, now: NOW });
  assert.equal(t.direction, "lose");
  assert.ok(t.kcal < 2810 && t.kcal >= 2810 - 950);
  assert.equal(t.proteinBasis, "ffm");
  assert.ok(t.protein >= 160 && t.protein <= 200);
});
test("deficit follows what the goal needs (fat target), not a fixed minimum", () => {
  const t = dailyTargets({ goal, body, maint: { kcal: 2810, bmr: { kcal: 1830 } }, profile: { sex: "m" }, now: NOW });
  assert.ok(2810 - t.kcal >= 200 && 2810 - t.kcal <= 400, String(t.kcal));
  const crash = dailyTargets({ goal: { target_weight: 70, target_date: day(30) }, body, maint: { kcal: 2810, bmr: { kcal: 1830 } }, profile: { sex: "m" }, now: NOW });
  assert.ok(2810 - crash.kcal <= Math.round(body.weight * 0.01 * 7700 / 7) + 10);   // capped at 1 %/wk
});
test("daily calories never go below the floor", () => {
  const t = dailyTargets({ goal: { target_weight: 60, target_date: day(30) }, body: { weight: 70 }, maint: { kcal: 1500, bmr: { kcal: 1400 } }, profile: { sex: "f" }, now: NOW });
  assert.ok(t.kcal >= 1540); assert.equal(t.floorHit, true);
});
test("maintenance blends formula and watch, asks for profile when nothing is known", () => {
  const m = maintenance({ profile: { sex: "m", birth_year: 1992, height_cm: 178, activity: "sit", train_days: [0, 1, 3, 4] }, body, days: [1, 2, 3, 4, 5].map((n) => ({ date: day(-n), burn_kcal: 2900 })), sessions: [], weights: [], scans: [], now: NOW });
  assert.ok(m.kcal > 2000 && m.kcal < 3300);
  assert.equal(maintenance({ profile: {}, body: { weight: 80 }, days: [], sessions: [], weights: [], scans: [], now: NOW }).missing, "profile");
});

// ── Realistic? ──
test("feasibility grades each target and gives an earliest date", () => {
  const f = feasibility({ goal, body, profile: { experience: "mid", sex: "m" }, now: NOW });
  assert.ok(["ok", "warn", "bad"].includes(f.weight.kind));
  assert.equal(f.bodyFat.kind, "ok");
  assert.ok(["warn", "bad"].includes(f.muscle.kind));   // +1 kg in 8 weeks while cutting is fast
  assert.ok(f.earliest > day(0));
});
test("a crash goal is graded unlikely", () => {
  const f = feasibility({ goal: { target_weight: 70, target_date: day(28) }, body, profile: {}, now: NOW });
  assert.equal(f.weight.kind, "bad");
});
test("consistency: targets that describe one body pass, mismatched ones get alternatives", () => {
  const c = consistency({ goal, body });
  assert.ok(c); assert.ok(typeof c.expected === "number");
  const bad = consistency({ goal: { ...goal, target_muscle_kg: 75 }, body });
  assert.equal(bad.ok, false); assert.ok(bad.altWeight > 84);
});
test("coach: no food logged recently → ask to log", () => {
  const tips = coachTips({ goal, body, targets: { direction: "lose", ratePct: 0.75, protein: 175 }, tracks: {}, days: [], weights, scans, now: NOW });
  assert.ok(tips.some((t) => t.key === "logFood"));
});
test("local date is the phone's calendar day", () => {
  assert.equal(localISO(new Date(2026, 0, 5, 1, 30)), "2026-01-05");
});

// ── Apple Watch endpoint parsing ──
test("Shortcut numbers parse with units and separators", () => {
  assert.equal(toKcal("1,234"), 1234);
  assert.equal(toKcal("812,5"), 812.5);
  assert.equal(toKcal("1968 kcal"), 1968);
  assert.equal(toKcal(700), 700);
  assert.equal(toKcal("abc"), null);
  assert.equal(toKcal("٦١٢٫٤"), 612.4);
  assert.equal(toKcal("١٬٢٣٤"), 1234);
});

test("watch burn is filed under the phone's own date, not UTC", () => {
  const at = new Date("2026-11-09T22:30:00Z");          // 1:30 am on the 10th in Riyadh
  assert.equal(localDate("Asia/Riyadh", at), "2026-11-10");
  assert.equal(localDate("", at), "2026-11-09");
  assert.equal(localDate("Not/AZone", at), "2026-11-09");
});
test("a send with no active energy (iPhone locked) changes nothing", async () => {
  const real = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => { called = true; return { ok: true, status: 200, json: async () => ({ ok: true }) }; };
  try {
    let code = 0;
    const res = { status(c) { code = c; return this; }, json() { return this; } };
    await burnHandler({ method: "GET", query: { key: "k".repeat(28), resting: "1968", active: "" }, headers: {} }, res);
    assert.equal(code, 400); assert.equal(called, false);
    await burnHandler({ method: "GET", query: { key: "k".repeat(28), resting: "1968", active: "612" }, headers: { "x-vercel-ip-timezone": "Asia/Riyadh" } }, res);
    assert.equal(code, 200); assert.equal(called, true);
  } finally { globalThis.fetch = real; }
});

// ── Your own counts and exercises ──
test("you choose how many exercises per muscle — more than suggested", () => {
  const rec = recommendedCounts({ muscles: ["Triceps"], minutes: 60 });
  assert.equal(rec.Triceps, 3);
  const s = adjustSession([], { muscles: ["Triceps"], counts: { Triceps: 4 } });
  assert.equal(s.length, 4);
  assert.equal(new Set(s.map((x) => x.ex)).size, 4);
  assert.ok(s.every((x) => BY_ID[x.ex].group === "triceps"));
});
test("whole muscle: each exercise aims at a different part, then round again", () => {
  const lead = (s) => s.map((x) => musclesOf(x.ex).primary[0]);
  assert.deepEqual(lead(adjustSession([], { muscles: ["Biceps"], counts: { Biceps: 3 } })), ["bicepsLong", "bicepsShort", "brachialis"]);
  assert.deepEqual(lead(adjustSession([], { muscles: ["Triceps"], counts: { Triceps: 3 } })), ["tricepsLong", "tricepsLateral", "tricepsMedial"]);
  assert.deepEqual(lead(adjustSession([], { muscles: ["Shoulders"], counts: { Shoulders: 3 } })), ["frontDelts", "sideDelts", "rearDelts"]);
  const back = adjustSession([], { muscles: ["Back"], counts: { Back: 3 } });
  assert.deepEqual(back.map((x) => BY_ID[x.ex].group).sort(), ["row", "row", "vpull"]);
  assert.ok(coverage("Back", back).slice(0, 3).every((c) => c.done));
  const legs = adjustSession([], { muscles: ["Legs"], counts: { Legs: 6 } });
  assert.deepEqual(legs.map((x) => BY_ID[x.ex].group).sort(), ["calf", "glutes", "hinge", "legcurl", "legext", "squat"]);
  // Two biceps → both heads; the third part (brachialis) shows as still open.
  const two = coverage("Biceps", adjustSession([], { muscles: ["Biceps"], counts: { Biceps: 2 } }));
  assert.deepEqual(two.map((c) => c.done), [true, true, false]);
  // A whole-muscle curl you already have counts for every head.
  assert.ok(coverage("Biceps", [{ ex: "db_curl" }]).every((c) => c.done));
  // More than the parts: it goes round again with different exercises.
  const five = adjustSession([], { muscles: ["Biceps"], counts: { Biceps: 5 } });
  assert.equal(new Set(five.map((x) => x.ex)).size, 5);
});
test("same angle: exercises that lead with the same part of the muscle", () => {
  assert.ok(sameAngle("incline_db_curl", "drag_curl"));
  assert.ok(sameAngle("preacher_curl", "concentration_curl"));
  assert.ok(sameAngle("hammer_curl", "cross_body_hammer"));
  assert.ok(sameAngle("db_curl", "barbell_curl"));
  assert.ok(!sameAngle("db_curl", "preacher_curl"));
  assert.ok(!sameAngle("incline_db_curl", "preacher_curl"));
  assert.ok(sameAngle("overhead_cable_ext", "skull_crusher"));
  assert.ok(!sameAngle("overhead_cable_ext", "rope_pushdown"));
  assert.ok(sameAngle("lat_pulldown", "pull_up"));
  assert.ok(!sameAngle("lat_pulldown", "close_grip_pulldown"));
  assert.ok(sameAngle("back_squat", "hack_squat"));
  assert.ok(!sameAngle("back_squat", "leg_extension"));
  assert.ok(sameAngle("bench_press", "db_bench_press"));
  assert.ok(!sameAngle("bench_press", "incline_db_press"));
});
test("changing counts keeps exercises already there (and their swaps)", () => {
  let s = adjustSession([], { muscles: ["Chest"], counts: { Chest: 2 } });
  s = s.map((x, i) => (i === 0 ? { ...x, ex: "machine_chest_press" } : x));
  const more = adjustSession(s, { muscles: ["Chest"], counts: { Chest: 4 } });
  assert.equal(more.length, 4);
  assert.ok(more.some((x) => x.ex === "machine_chest_press"));
  const less = adjustSession(more, { muscles: ["Chest"], counts: { Chest: 1 } });
  assert.equal(less.length, 1);
});
test("zero suggested + your own exercises; your own are never removed", () => {
  const mine = [makeSlot({ group: "curl", ex: "hammer_curl", muscle: "Biceps", manual: true }), makeCustomSlot({ name: "Cable kickback", muscle: "Triceps" })];
  const s = adjustSession(mine, { muscles: ["Biceps", "Triceps"], counts: { Biceps: 0, Triceps: 0 } });
  assert.equal(s.length, 2);
  assert.ok(s[1].custom);
});
test("sets for every exercise applies to new exercises", () => {
  const s = adjustSession([], { muscles: ["Back"], counts: { Back: 3 }, sets: 5 });
  assert.ok(s.every((x) => x.sets === 5));
});
test("each exercise keeps its own number of sets when the session changes", () => {
  let s = adjustSession([], { muscles: ["Chest"], counts: { Chest: 2 } });
  s = s.map((x, i) => (i === 0 ? { ...x, sets: 6 } : x));
  const more = adjustSession(s, { muscles: ["Chest"], counts: { Chest: 3 }, sets: 4 });
  assert.equal(more.find((x) => x.id === s[0].id).sets, 6);
  assert.equal(more.filter((x) => !s.some((o) => o.id === x.id))[0].sets, 4);
});
test("one number for every exercise never hides saved sets", () => {
  const s = adjustSession([], { muscles: ["Biceps"], counts: { Biceps: 2 } });
  const done = { [s[0].id]: [{ kg: 10, reps: 12 }, { kg: 10, reps: 11 }, { kg: 10, reps: 10 }] };
  const all = setAllSets(s, 2, done);
  assert.equal(all[0].sets, 3);
  assert.equal(all[1].sets, 2);
  const sug = suggestedSets(all.map((x) => ({ ...x, sets: 9 })), {}, done);
  assert.ok(sug.every((x) => x.sets === 3));
});
test("plan review: change the sets of one exercise", () => {
  const plan = generatePlan({ train_days: [0, 2, 4], session_min: 60 });
  const id = plan.days[0].slots[1].id;
  const p2 = setSlotSets(plan, id, 5);
  assert.equal(p2.days[0].slots[1].sets, 5);
  assert.equal(setSlotSets(plan, id, 0).days[0].slots[1].sets, 1);
  assert.equal(plan.days[0].slots[1].sets === 5, false);
});

// ── Library and muscle map ──
test("every exercise has a known group and muscles on the map; photos are unique", () => {
  assert.ok(EXERCISES.length >= 270);
  assert.ok(EXERCISES.filter((e) => !e.img).length <= 15);
  const regionsFront = new Set(FRONT.map(([r]) => r)), regionsBack = new Set(BACK.map(([r]) => r));
  for (const e of EXERCISES) {
    assert.ok(GROUPS[e.group], e.id);
    const m = musclesOf(e);
    assert.ok(m.primary.length > 0, e.id);
    for (const k of [...m.primary, ...m.secondary]) {
      assert.ok(MUSCLE_LABELS[k], `${e.id}: ${k}`);
      (REGIONS[k].front || []).forEach((r) => assert.ok(regionsFront.has(r), r));
      (REGIONS[k].back || []).forEach((r) => assert.ok(regionsBack.has(r), r));
    }
    assert.ok(e.name[0] && e.name[1] && e.gear[0] && e.gear[1] && e.why[0] && e.why[1], e.id);
  }
  assert.equal(new Set(EXERCISES.map((e) => e.id)).size, EXERCISES.length);
  const imgs = EXERCISES.map((e) => e.img).filter(Boolean);
  assert.equal(new Set(imgs).size, imgs.length);
});
test("plenty of swaps: biceps alone has 20+ in a full gym", () => {
  assert.ok(swapOptions("db_curl", { equipment: "gym" }).length >= 20);
  assert.ok(swapOptions("db_curl", { equipment: "home" }).length >= 8);
  for (const g of Object.keys(GROUPS)) {
    if (["legpress", "legext", "abduction", "adduction"].includes(g)) continue;
    assert.ok(EXERCISES.filter((e) => e.group === g).length >= 5, g);
  }
});
test("muscle map: hammer curls hit brachialis and forearm, deadlifts light the whole back chain", () => {
  assert.deepEqual(musclesOf("hammer_curl").primary, ["brachialis", "brachioradialis"]);
  assert.deepEqual(musclesOf("db_curl").primary, ["biceps"]);
  const back = regionLevels(musclesOf("deadlift"), "back");
  assert.equal(back["ham-upper"], "primary"); assert.equal(back["ham-lower"], "primary");
  assert.equal(back["lower-back"], "primary"); assert.equal(back["traps-upper"], "secondary");
  const front = regionLevels(musclesOf("bench_press"), "front");
  assert.equal(front["chest-mid"], "primary"); assert.equal(front["tri-long"], "secondary"); assert.equal(front["quad-rf"], undefined);
  assert.deepEqual(musclesOf("close_grip_bench").primary, ["tricepsLateral", "tricepsMedial"]);
  assert.deepEqual(slotMuscles({ custom: true, muscle: "Biceps" }).primary, ["biceps"]);
});
test("muscle parts: biceps and triceps heads, upper/lower lats, quads and hamstrings", () => {
  const f = (id) => regionLevels(musclesOf(id), "front"), b = (id) => regionLevels(musclesOf(id), "back");
  assert.equal(f("incline_db_curl")["biceps-long"], "primary"); assert.equal(f("incline_db_curl")["biceps-short"], "secondary");
  assert.equal(f("preacher_curl")["biceps-short"], "primary"); assert.equal(f("spider_curl")["biceps-long"], "secondary");
  assert.equal(f("hammer_curl").brachialis, "primary"); assert.equal(f("hammer_curl").brachiorad, "primary");
  assert.equal(f("db_curl")["biceps-long"], "primary"); assert.equal(f("db_curl")["biceps-short"], "primary");
  assert.equal(b("overhead_cable_ext")["tri-long"], "primary"); assert.equal(b("overhead_cable_ext")["tri-lateral"], "secondary");
  assert.equal(b("rope_pushdown")["tri-lateral"], "primary"); assert.equal(b("reverse_pushdown")["tri-medial"], "primary");
  assert.equal(b("lat_pulldown")["lats-upper"], "primary"); assert.equal(b("lat_pulldown")["lats-lower"], "secondary");
  assert.equal(b("close_grip_pulldown")["lats-lower"], "primary"); assert.equal(b("one_arm_db_row")["lats-lower"], "primary");
  assert.equal(f("leg_extension")["quad-rf"], "primary"); assert.equal(f("leg_extension")["quad-vl"], "secondary");
  assert.equal(f("back_squat")["quad-vl"], "primary"); assert.equal(f("back_squat")["quad-vm"], "primary"); assert.equal(f("back_squat")["quad-rf"], "secondary");
  assert.equal(b("romanian_deadlift")["ham-upper"], "primary"); assert.equal(b("romanian_deadlift")["ham-lower"], "secondary");
  assert.equal(b("lying_leg_curl")["ham-lower"], "primary"); assert.equal(b("seated_leg_curl")["ham-upper"], "primary");
  // Not one picture for every exercise of a muscle any more.
  const pictures = (g) => new Set(EXERCISES.filter((e) => e.group === g).map((e) => JSON.stringify(musclesOf(e).primary))).size;
  assert.ok(pictures("curl") >= 5, `curl ${pictures("curl")}`);
  assert.ok(pictures("triceps") >= 4, `triceps ${pictures("triceps")}`);
  assert.ok(pictures("vpull") >= 4 && pictures("row") >= 4);
  // Every part drawn on the map belongs to some muscle.
  const used = new Set(Object.values(REGIONS).flatMap((r) => [...(r.front || []), ...(r.back || [])]));
  for (const [r] of [...FRONT, ...BACK]) if (!["head", "knees"].includes(r)) assert.ok(used.has(r), r);
});
test("muscle parts: which part of the chest, shoulder, abs and calves", () => {
  const lv = (id) => regionLevels(musclesOf(id), "front");
  assert.equal(lv("incline_db_press")["chest-upper"], "primary");
  assert.equal(lv("incline_db_press")["chest-mid"], "secondary");
  assert.equal(lv("bench_press")["chest-mid"], "primary");
  assert.equal(lv("decline_bench_press")["chest-lower"], "primary");
  assert.equal(lv("low_cable_crossover")["chest-upper"], "primary");
  assert.equal(lv("cable_crossover")["chest-lower"], "primary");
  assert.equal(lv("chest_dip")["chest-lower"], "primary");
  assert.equal(lv("front_db_raise")["delt-front"], "primary");
  assert.equal(lv("db_lateral_raise")["delt-side-f"], "primary");
  assert.equal(lv("db_lateral_raise")["delt-front"], undefined);
  assert.equal(regionLevels(musclesOf("face_pull"), "back")["delt-rear"], "primary");
  assert.equal(lv("hanging_leg_raise")["abs-lower"], "primary");
  assert.equal(lv("crunch")["abs-upper"], "primary");
  assert.equal(regionLevels(musclesOf("seated_calf_raise"), "back")["left-soleus"], "primary");
  assert.equal(regionLevels(musclesOf("hip_abduction_machine"), "back")["glute-med"], "primary");
  assert.equal(regionLevels(musclesOf("hip_thrust"), "back")["glute-max"], "primary");
  for (const [chip, keys] of Object.entries(PARTS)) keys.forEach((k) => assert.ok(REGIONS[k] && MUSCLE_LABELS[k], `${chip}:${k}`));
  assert.deepEqual(customMuscles("Chest", ["upperChest"]).primary, ["upperChest"]);
});
test("small maps zoom on the target and pick the right side", () => {
  assert.equal(mainView(musclesOf("bench_press"), "hpress"), "front");
  assert.equal(mainView(musclesOf("seated_cable_row"), "row"), "back");
  assert.equal(mainView(musclesOf("barbell_shrug"), "shrug"), "back");
  const box = focusBox(musclesOf("bench_press"), "front");
  assert.ok(box[3] < 80 && box[1] > 10 && box[1] + box[3] < 90, JSON.stringify(box));   // torso, not the whole body
  const legs = focusBox(musclesOf("leg_extension"), "front");
  assert.ok(legs[1] > 70, JSON.stringify(legs));
  // Arms: one arm with its shoulder, big enough to see the heads.
  const arm = focusBox(musclesOf("incline_db_curl"), "front");
  assert.ok(arm[0] >= 50 && arm[2] < 45 && arm[1] < 40, JSON.stringify(arm));
  assert.equal(mainView(musclesOf("rope_pushdown"), "triceps"), "back");
  assert.equal(mainView(musclesOf("back_squat"), "squat"), "front");
  assert.equal(mainView(musclesOf("deficit_reverse_lunge"), "lunge"), "back");
  for (const e of EXERCISES) {
    const m = musclesOf(e), v = mainView(m, e.group), b = focusBox(m, v);
    assert.ok(b && b[0] >= 0 && b[1] >= 0 && b[0] + b[2] <= 100.01 && b[1] + b[3] <= 220.01, `${e.id} ${JSON.stringify(b)}`);
  }
});
test("search finds the pec fly machine in Arabic and English, names first", () => {
  assert.equal(searchExercises("فراشة")[0].id, "pec_deck");
  assert.equal(searchExercises("pec fly")[0].id, "pec_deck");
  assert.ok(searchExercises("rear delt").some((e) => e.id === "reverse_pec_deck"));
  assert.ok(searchExercises("أعلى الصدر").slice(0, 5).every((e) => musclesOf(e).primary.includes("upperChest")));
  assert.deepEqual(searchExercises("   "), []);
  assert.deepEqual(searchExercises("zzzz"), []);
});

// ── Same as last time ──
const pastLogs = [
  { id: "a1", date: "2026-11-05", exercise: "Bench Press", muscle_group: "Chest", weight_kg: 80, reps: 8, created_at: "2026-11-05T17:00:00Z" },
  { id: "a2", date: "2026-11-05", exercise: "Bench Press", muscle_group: "Chest", weight_kg: 80, reps: 7, created_at: "2026-11-05T17:03:00Z" },
  { id: "a3", date: "2026-11-05", exercise: "Cable kickback", muscle_group: "Triceps", weight_kg: 10, reps: 12, created_at: "2026-11-05T17:20:00Z" },
  { id: "a4", date: "2026-11-05", exercise_id: "pec_deck", exercise: "Pec deck", muscle_group: "Chest", weight_kg: 50, reps: 12, created_at: "2026-11-05T17:10:00Z" },
  { id: "a5", date: "2026-11-05", exercise_id: "pec_deck", exercise: "Pec deck", muscle_group: "Chest", weight_kg: 50, reps: 11, created_at: "2026-11-05T17:12:00Z" },
  { id: "a6", date: "2026-11-05", exercise_id: "pec_deck", exercise: "Pec deck", muscle_group: "Chest", weight_kg: 50, reps: 10, created_at: "2026-11-05T17:14:00Z" },
  { id: "b1", date: "2026-11-07", exercise_id: "lat_pulldown", exercise: "Lat pulldown", muscle_group: "Back", weight_kg: 60, reps: 10, created_at: "2026-11-07T17:00:00Z" },
  { id: "c1", date: "2026-11-09", exercise_id: "db_curl", exercise: "Dumbbell curl", muscle_group: "Biceps", weight_kg: 14, reps: 10 },
];
test("past workouts: one per day, newest first, exercises in order with their sets", () => {
  const w = pastWorkouts(pastLogs, { before: "2026-11-09" });
  assert.deepEqual(w.map((x) => x.date), ["2026-11-07", "2026-11-05"]);
  assert.deepEqual(w[1].items.map((i) => [i.id || i.name, i.sets]), [["bench_press", 2], ["pec_deck", 3], ["Cable kickback", 1]]);
  assert.deepEqual(w[1].muscles, ["Chest", "Triceps"]);
});
test("a typed name never turns into another muscle's exercise", () => {
  const w = pastWorkouts(pastLogs, { before: "2026-11-09" });
  const kick = w[1].items.find((i) => i.name === "Cable kickback");
  assert.equal(kick.id, null);
  assert.equal(kick.muscle, "Triceps");
});
test("same as last time: the exercises and sets from the last time you trained that muscle", () => {
  const w = pastWorkouts(pastLogs, { before: "2026-11-09" });
  const last = lastTimeFor("Chest", w);
  assert.equal(last.date, "2026-11-05");
  const slots = slotsFromItems(last.items, { muscle: "Chest" });
  assert.deepEqual(slots.map((s) => [s.ex, s.sets, s.muscle]), [["bench_press", 2, "Chest"], ["pec_deck", 3, "Chest"]]);
  assert.equal(lastTimeFor("Legs", w), null);
  const tri = slotsFromItems(lastTimeFor("Triceps", w).items, { mine: (n) => (n === "Cable kickback" ? { parts: ["triceps"] } : null) });
  assert.ok(tri[0].custom); assert.equal(tri[0].name, "Cable kickback"); assert.deepEqual(tri[0].parts, ["triceps"]);
  assert.ok(sameExercise(slots[0], { ex: "bench_press" }));
  assert.ok(sameExercise(tri[0], { custom: true, name: "cable KICKBACK" }));
});
test("your own exercise keeps its history by name", () => {
  const logs = [{ exercise: "Cable kickback", weight_kg: 10, reps: 12, date: day(-3) }, { exercise: "Other", weight_kg: 5, reps: 5, date: day(-3) }];
  const h = liftHistory(logs, null, customMatch("cable kickback"));
  assert.equal(h.length, 1); assert.equal(h[0].sets[0].weight_kg, 10);
});

// ── Records, volume, rest ──
test("records: heaviest, stronger (e1RM) and bodyweight reps; never on a first time", () => {
  const best = bestOf(hist(["2026-11-01", [[80, 8], [80, 7]]], ["2026-10-25", [[77.5, 9]]]));
  assert.equal(best.weight, 80);
  assert.equal(recordKind({ kg: 82.5, reps: 5 }, best), "weight");
  assert.equal(recordKind({ kg: 80, reps: 10 }, best), "e1rm");
  assert.equal(recordKind({ kg: 80, reps: 8 }, best), null);
  assert.equal(recordKind({ kg: 82.5, reps: 5 }, null), null);
  const bw = bestOf(hist(["2026-11-01", [[0, 12]]]));
  assert.equal(recordKind({ kg: 0, reps: 14 }, bw), "reps");
  assert.equal(recordIndex([{ kg: 80, reps: 9 }, { kg: 82.5, reps: 8 }, null], best), 1);
  assert.ok(e1rm(100, 30) === e1rm(100, 12));
  assert.equal(volumeOf([{ kg: 80, reps: 10 }, { kg: 0, reps: 15 }, null, { weight_kg: 50, reps: 2 }]), 900);
  assert.equal(restSeconds({ compound: true }), 120);
  assert.equal(restSeconds({ compound: true, focus: "strength" }), 180);
  assert.equal(restSeconds({ compound: false, saved: 75 }), 75);
});
test("offline sets get their real ids once sent; a refused one shows as not saved", () => {
  const s = { done: { a: [{ kg: 80, reps: 8, logId: "tmp_1", pending: true }, { kg: 80, reps: 8, logId: "x9", pending: true }], b: [{ kg: 20, reps: 10, logId: "tmp_2", pending: true }] } };
  const r = remapDone(s, { tmp_1: "n1", tmp_2: false }, true);
  assert.deepEqual(r.done.a.map((d) => [d.logId, d.pending]), [["n1", false], ["x9", false]]);
  assert.equal(r.done.b[0], null);
});

// ── Weekly report and calorie check-in ──
test("the report covers Sunday to Saturday, the week before the latest Sunday", () => {
  assert.deepEqual(reportWeek("2026-11-15"), { key: "2026-11-15", from: "2026-11-08", to: "2026-11-14" });   // Sunday
  assert.deepEqual(reportWeek("2026-11-14"), { key: "2026-11-08", from: "2026-11-01", to: "2026-11-07" });   // Saturday
  assert.deepEqual(pastWeeks("2026-11-12", 3).map((w) => w.from), ["2026-11-01", "2026-10-25", "2026-10-18"]);
  assert.deepEqual(weekBefore(reportWeek("2026-11-15")), { key: "2026-11-08", from: "2026-11-01", to: "2026-11-07" });
  assert.equal(goalKey(null), null);
  assert.notEqual(goalKey({ id: 1, target_weight: 80 }), goalKey({ id: 1, target_weight: 79 }));
});
test("weight change works with one weigh-in a week", () => {
  const w = weekWeight([{ date: "2026-11-01", weight: 86 }, { date: "2026-11-08", weight: 85.4 }], [], { from: "2026-11-07", to: "2026-11-13" });
  assert.equal(w.delta, -0.6); assert.equal(w.perWeek, -0.6);
  assert.equal(weekWeight([{ date: "2026-11-08", weight: 85.4 }], [], { from: "2026-11-07", to: "2026-11-13" }).start, null);
});
const ciData = (kcal, weights) => {
  const days = [];
  for (let i = 0; i < 28; i++) days.push({ date: new Date(Date.UTC(2026, 10, 13) - i * 864e5).toISOString().slice(0, 10), kcal_in: kcal, protein_g: 160 });
  return { days, weights, sessions: [], scans: [] };
};
const ciGoal = { id: "g", start_date: "2026-10-01", target_date: "2027-02-01", target_weight: 78 };
const ciProfile = { sex: "m", birth_year: 1992, height_cm: 178, activity: "feet" };
test("check-in: losing slower than the goal → a small cut, capped at 150", () => {
  const d = ciData(2400, [{ date: "2026-10-18", weight: 86 }, { date: "2026-10-25", weight: 85.95 }, { date: "2026-11-01", weight: 85.9 }, { date: "2026-11-08", weight: 85.85 }, { date: "2026-11-13", weight: 85.8 }]);
  const c = calorieCheckin({ goal: ciGoal, profile: ciProfile, body: { weight: 85.8 }, ...d, current: 2400, to: "2026-11-13" });
  assert.equal(c.status, "adjust");
  assert.ok(c.change < 0 && c.change >= -MAX_STEP, JSON.stringify(c));
  assert.ok(c.burn > 2300 && c.burn < 2500, JSON.stringify(c));   // weight barely moved → burn ≈ what you ate
});
test("check-in: losing much faster than planned → eat a little more", () => {
  const d = ciData(1700, [{ date: "2026-10-18", weight: 90 }, { date: "2026-10-25", weight: 88.9 }, { date: "2026-11-01", weight: 87.8 }, { date: "2026-11-08", weight: 86.7 }, { date: "2026-11-13", weight: 85.9 }]);
  const c = calorieCheckin({ goal: { ...ciGoal, target_weight: 84, target_date: "2027-04-01" }, profile: ciProfile, body: { weight: 85.9 }, ...d, current: 1700, to: "2026-11-13" });
  assert.equal(c.status, "adjust", JSON.stringify(c));
  assert.ok(c.change > 0 && c.change <= MAX_STEP);
});
test("check-in needs food logged 5+ days and weigh-ins; waits 2 weeks for a new goal", () => {
  const d = ciData(2200, [{ date: "2026-10-25", weight: 86 }, { date: "2026-11-08", weight: 85.5 }]);
  assert.equal(calorieCheckin({ goal: ciGoal, ...d, days: d.days.slice(0, 3), current: 2200, to: "2026-11-13" }).status, "need-food");
  assert.equal(calorieCheckin({ goal: ciGoal, ...d, weights: [], current: 2200, to: "2026-11-13" }).status, "need-weight");
  assert.equal(calorieCheckin({ goal: { ...ciGoal, start_date: "2026-11-08" }, ...d, current: 2200, to: "2026-11-13" }).status, "early");
  assert.equal(calorieCheckin({ goal: null, ...d, current: 2200, to: "2026-11-13" }).status, "no-goal");
});
test("weekly report: food average, workouts, sets and records of the week", () => {
  const data = {
    days: [{ date: "2026-11-08", kcal_in: 2000, protein_g: 150 }, { date: "2026-11-09", kcal_in: 2400, protein_g: 170 }, { date: "2026-11-01", kcal_in: 9999 }],
    logs: [
      { date: "2026-11-01", exercise_id: "bench_press", weight_kg: 80, reps: 8 },
      { date: "2026-11-10", exercise_id: "bench_press", weight_kg: 82.5, reps: 8 },
      { date: "2026-11-10", exercise_id: "bench_press", weight_kg: 80, reps: 8 },
      { date: "2026-11-12", exercise_id: "lat_pulldown", weight_kg: 60, reps: 10 },
    ],
    weights: [], inbody: [], sessions: [], goal: null,
  };
  const r = weeklyReport({ week: reportWeek("2026-11-15"), data, current: 2200, protein: 170 });
  assert.equal(r.food.days, 2); assert.equal(r.food.kcal, 2200); assert.equal(r.food.protein, 160);
  assert.equal(r.training.workouts, 2); assert.equal(r.training.sets, 3);
  assert.deepEqual(r.training.records.map((x) => [x.id, x.kg]), [["bench_press", 82.5]]);
  assert.equal(r.checkin.status, "no-goal");
});
test("weekly report: time, weight moved, sets per muscle, each exercise vs last time, burn, comparison, advice", () => {
  const set = (date, id, muscle, kg, reps) => ({ date, exercise_id: id, exercise: BY_ID[id].name[0], muscle_group: muscle, weight_kg: kg, reps });
  const data = {
    logs: [
      set("2026-11-03", "bench_press", "Chest", 80, 8), set("2026-11-03", "bench_press", "Chest", 80, 8),
      set("2026-11-03", "incline_db_curl", "Biceps", 12, 12), set("2026-11-03", "incline_db_curl", "Biceps", 12, 12),
      set("2026-11-10", "bench_press", "Chest", 82.5, 8), set("2026-11-10", "bench_press", "Chest", 82.5, 8), set("2026-11-10", "bench_press", "Chest", 82.5, 7),
      set("2026-11-12", "incline_db_curl", "Biceps", 12, 15), set("2026-11-12", "incline_db_curl", "Biceps", 12, 15), set("2026-11-12", "incline_db_curl", "Biceps", 12, 15),
      set("2026-11-12", "lat_pulldown", "Back", 60, 10),
    ],
    sessions: [{ date: "2026-11-10", duration_min: 55 }, { date: "2026-11-12", duration_min: 48 }, { date: "2026-11-03", duration_min: 40 }],
    days: [
      { date: "2026-11-08", kcal_in: 2000, protein_g: 120, burn_kcal: 2500 }, { date: "2026-11-09", kcal_in: 2400, protein_g: 130, burn_kcal: 2700 },
      { date: "2026-11-10", kcal_in: 2200, protein_g: 140, burn_kcal: 2600 }, { date: "2026-11-03", kcal_in: 2600, burn_kcal: 2400 },
    ],
    weights: [{ date: "2026-11-02", weight: 86 }, { date: "2026-11-13", weight: 85.4 }], inbody: [], goal: null,
  };
  const r = weeklyReport({ week: reportWeek("2026-11-15"), data, current: 2200, protein: 170, resting: 1900 });
  assert.equal(r.training.minutes, 103); assert.equal(r.training.sessions, 2);
  assert.equal(r.training.volume, Math.round(82.5 * 8 * 2 + 82.5 * 7 + 12 * 15 * 3 + 60 * 10));
  assert.deepEqual(r.training.muscles, { Chest: 3, Biceps: 3, Back: 1 });
  const bench = r.training.exercises.find((x) => x.id === "bench_press");
  assert.deepEqual([bench.sets, bench.top, bench.prevTop, bench.change, bench.record], [3, 82.5, 80, 2.5, true]);
  const curl = r.training.exercises.find((x) => x.id === "incline_db_curl");
  assert.equal(curl.change, 0); assert.equal(curl.next.kind, "up");               // top of 10–15 in every set → go up
  assert.equal(curl.repsChange, 3);                                                 // same 12 kg, 15 reps vs 12 last time
  assert.equal(bench.repsChange, null);
  assert.equal(r.training.exercises[0].muscle, "Chest");                            // ordered by muscle
  assert.deepEqual([r.burn.avg, r.burn.body, r.burn.moving, r.burn.days], [2600, 1900, 700, 3]);
  assert.deepEqual(r.balance, { kcal: -400, kgPerWeek: -0.36 });
  assert.equal(r.food.daily.length, 7); assert.equal(r.food.daily[0].kcal, 2000); assert.equal(r.food.daily[6].kcal, null);
  assert.equal(r.food.proteinHit, 0);
  assert.equal(r.weight.delta, -0.6);
  assert.deepEqual([r.prev.workouts, r.prev.sets, r.prev.minutes, r.prev.kcal], [1, 4, 40, 2600]);
  const ks = r.recs.map((x) => x.k);
  assert.ok(ks.includes("recProtein"), ks.join());
  assert.ok(ks.includes("recLogMore"));
  assert.ok(ks.includes("recUp"));
  assert.ok(ks.includes("recSetsLow"));
  assert.equal(r.recs.find((x) => x.k === "recUp").p.name[0], "Incline dumbbell curl");
  assert.ok(r.recs.length <= 8);
  // A week with nothing at all asks for training first.
  const empty = weeklyReport({ week: reportWeek("2026-11-22"), data, current: 2200, protein: 170, resting: 1900 });
  assert.equal(empty.recs[0].k, "recNoTraining");
});
test("report document: every section, in both languages, and as text to paste anywhere", () => {
  const set = (date, id, muscle, kg, reps) => ({ date, exercise_id: id, exercise: BY_ID[id].name[0], muscle_group: muscle, weight_kg: kg, reps });
  const data = {
    logs: [set("2026-11-03", "bench_press", "Chest", 80, 8), set("2026-11-10", "bench_press", "Chest", 82.5, 8), set("2026-11-12", "lat_pulldown", "Back", 60, 10)],
    sessions: [{ date: "2026-11-10", duration_min: 75 }],
    days: [{ date: "2026-11-09", kcal_in: 2400, protein_g: 130, burn_kcal: 2700 }, { date: "2026-11-10", kcal_in: 2200, protein_g: 175, burn_kcal: 2600 }],
    weights: [{ date: "2026-11-02", weight: 86 }, { date: "2026-11-13", weight: 85.4 }], inbody: [], goal: null,
  };
  const r = weeklyReport({ week: reportWeek("2026-11-15"), data, current: 2200, protein: 170, resting: 1900 });
  for (const lang of ["en", "ar"]) {
    const t = makeT(lang);
    const blocks = reportDoc(r, { t, lang, name: "Ali" });
    const types = blocks.map((b) => b.type);
    for (const ty of ["title", "sub", "stats", "h2", "bars", "table", "list", "checkin"]) assert.ok(types.includes(ty), `${lang} ${ty}`);
    assert.equal(blocks.find((b) => b.type === "stats").items.length, 7);
    const text = docText(blocks);
    assert.ok(!/\{[a-z0-9]+\}/i.test(text), `${lang}: an unfilled {placeholder} in the text`);
    assert.ok(text.includes("82.5×8"), lang);
    assert.ok(text.includes("1,250") || text.includes("1250") || text.length > 400);
    if (lang === "en") {
      assert.ok(text.startsWith("# Weekly report"));
      assert.ok(text.includes("| Exercise | Sets | Best set | vs last time |"));
      assert.ok(text.includes("Bench press"));
      assert.ok(text.includes("body 1,900 + movement 750"));     // (2,700 + 2,600) / 2 = 2,650
      assert.ok(text.includes("## For next week"));
    } else {
      assert.ok(text.startsWith("# التقرير الأسبوعي"));
      assert.ok(text.includes("بنش برس"));
      assert.ok(text.includes("جسمك 1,900 + حركتك 750"));
    }
  }
});
test("PDF file: valid structure, one A4 page per image, offsets that match", () => {
  const fakeJpeg = (n) => ({ bytes: new Uint8Array(Array.from({ length: n }, (_, i) => i % 251)), w: 1190, h: 1684 });
  const bytes = pdfBytes([fakeJpeg(300), fakeJpeg(200)], { title: "التقرير الأسبوعي 1 Nov" });
  const text = Buffer.from(bytes).toString("latin1");
  assert.ok(text.startsWith("%PDF-1.4\n"));
  assert.ok(text.trimEnd().endsWith("%%EOF"));
  assert.equal((text.match(/\/Type \/Page /g) || []).length, 2);
  assert.ok(text.includes("/Count 2"));
  assert.ok(text.includes("/MediaBox [0 0 595.28 841.89]"));
  // every xref entry points at "n 0 obj"
  const xrefAt = Number(text.match(/startxref\n(\d+)/)[1]);
  assert.ok(text.slice(xrefAt).startsWith("xref"));
  const entries = text.slice(xrefAt).split("\n").slice(3).filter((l) => /^\d{10} 00000 n $/.test(l));
  entries.forEach((l, i) => { const at = Number(l.slice(0, 10)); assert.ok(text.slice(at).startsWith(`${i + 1} 0 obj`), `object ${i + 1}`); });
  assert.equal(entries.length, 1 + 1 + 3 * 2 + 1);   // catalog, pages, 3 per page, info
  assert.ok(text.includes("/Title <FEFF"));           // the title as UTF-16, so Arabic shows right
});

// ── Food log ──
test("food log: a row per day, newest first, with burn and ± target", () => {
  const days = [{ date: "2026-11-11", kcal_in: 800 }, { date: "2026-11-10", kcal_in: 2400, protein_g: 160, burn_kcal: 2700 }];
  const rows = dayRows({ days, sessions: [{ date: "2026-11-09", day_kcal: 2500 }], today: "2026-11-11", n: 5, target: 2200 });
  assert.deepEqual(rows.map((r) => r.date), ["2026-11-11", "2026-11-10", "2026-11-09", "2026-11-08", "2026-11-07"]);
  assert.equal(rows[0].today, true);
  assert.equal(rows[1].diff, 200); assert.equal(rows[1].burn, 2700);
  assert.equal(rows[2].logged, false); assert.equal(rows[2].burn, 2500); assert.equal(rows[2].diff, null);
});
test("last 7 days: full days only (today is still going), averages over the days you logged", () => {
  const days = [
    { date: "2026-11-11", kcal_in: 900 },                                        // today — not counted
    { date: "2026-11-10", kcal_in: 2100, protein_g: 150, burn_kcal: 2600 },
    { date: "2026-11-09", kcal_in: 2500, protein_g: 170 },
    { date: "2026-11-04", kcal_in: 1900, burn_kcal: 2500 },
    { date: "2026-11-03", kcal_in: 3000 },                                        // 8 days ago — not counted
  ];
  const w = lastSeven({ days, sessions: [], today: "2026-11-11", target: 2200, proteinTarget: 170 });
  assert.equal(w.from, "2026-11-04"); assert.equal(w.to, "2026-11-10");
  assert.equal(w.logged, 3); assert.equal(w.total, 6500); assert.equal(w.avg, 2167); assert.equal(w.vsTarget, -33);
  assert.equal(w.protein, 160);                                                  // days without protein don't pull it down
  assert.equal(w.burn, 2550); assert.equal(w.balance, -550); assert.equal(w.kgPerWeek, -0.5);
  assert.equal(w.rows.length, 7); assert.equal(w.rows[0].date, "2026-11-04");
});

// ── The day's calorie target follows the day's burn ──
test("today's target = today's burn (body + movement so far) − your goal's deficit, never below the safe minimum", () => {
  const targets = { kcal: 2150, maintenance: 2387, goalAdjust: -240 };
  assert.deepEqual(dayTarget({ targets, burn: null, bmr: 1822, sex: "m" }), { kcal: 2150, live: false });    // nothing from the watch yet: the plan
  const d = dayTarget({ targets, burn: 2510, bmr: 1822, sex: "m" });                                          // 1,822 + 688 so far
  assert.deepEqual([d.kcal, d.live, d.burn, d.adjust, d.floor], [2270, true, 2510, -240, null]);
  const morning = dayTarget({ targets, burn: 1872, bmr: 1822, sex: "m" });
  assert.deepEqual([morning.kcal, morning.floor], [2000, 2000]);                                               // 1,822 × 1.1
  assert.equal(kcalFloor(1822, "m"), 2000); assert.equal(kcalFloor(1000, "f"), 1200);
  // A check-in you applied takes 150 more off; "use it now" (shift 0) starts again from the goal.
  const locked = { ...targets, kcal: 2000, lock: { kcal: 2000, shift: -150 } };
  assert.equal(liveAdjust(locked), -390); assert.equal(dayTarget({ targets: locked, burn: 2510, bmr: 1822, sex: "m" }).kcal, 2120);
  assert.equal(liveAdjust({ ...locked, lock: { kcal: 2150, shift: 0 } }), -240);
  // Gaining: the surplus goes on top. No plan yet (no profile): no target.
  assert.equal(dayTarget({ targets: { kcal: 2700, maintenance: 2400, goalAdjust: 300 }, burn: 2500, bmr: 1700, sex: "m" }).kcal, 2800);
  assert.equal(dayTarget({ targets: null, burn: 2500 }).kcal, null);
  // The plan carries the goal's own deficit, before the safe minimum.
  const tg = dailyTargets({ goal: { target_weight: 80, target_date: "2027-03-01" }, body: { weight: 86 }, maint: { kcal: 2400, bmr: { kcal: 1800 } }, profile: { sex: "m" }, now: Date.UTC(2026, 10, 12) });
  assert.ok(tg.goalAdjust < 0 && tg.kcal === Math.max(Math.round((2400 + tg.goalAdjust) / 10) * 10, 1980), JSON.stringify(tg));
});
test("the line under today's calories shows the sum, in both languages", () => {
  const en = makeT("en"), ar = makeT("ar");
  const plain = (s) => s.replace(/[⁦-⁩]/g, "");
  assert.equal(plain(burnLine({ live: true, kcal: 2270, burn: 2510, adjust: -240, floor: null }, en)), "burned 2,510 − 240 for your goal");
  assert.equal(plain(burnLine({ live: true, kcal: 2000, burn: 1872, adjust: -240, floor: 2000 }, en)), "burned 1,872 − 240 for your goal · never below 2,000");
  assert.equal(plain(burnLine({ live: true, kcal: 2800, burn: 2500, adjust: 300, floor: null }, en)), "burned 2,500 + 300 for your goal");
  assert.equal(plain(burnLine({ live: true, kcal: 2510, burn: 2510, adjust: 0, floor: null }, en)), "your burn so far: 2,510");
  assert.equal(burnLine({ live: false, kcal: 2150 }, en), "");
  const a = burnLine({ live: true, kcal: 2270, burn: 2510, adjust: -240, floor: null }, ar);
  assert.ok(a.includes("⁦2,510 − 240⁩"), a);                    // the sum stays in one left-to-right piece
  assert.equal(plain(a), "حرقت 2,510 − 240 عشان هدفك");
});
test("food log: each day against its own target (its burn − the deficit, or the plan)", () => {
  const targetFor = (burn) => (burn ? { kcal: burn - 240, live: true } : { kcal: 2150, live: false });
  const days = [{ date: "2026-11-10", kcal_in: 2300, burn_kcal: 2600 }, { date: "2026-11-09", kcal_in: 2200 }];
  const rows = dayRows({ days, sessions: [], today: "2026-11-11", n: 3, target: 2150, targetFor });
  assert.deepEqual(rows.map((r) => [r.date, r.target, r.diff, r.live]), [["2026-11-11", 2150, null, false], ["2026-11-10", 2360, -60, true], ["2026-11-09", 2150, 50, false]]);
  const w = lastSeven({ days, sessions: [], today: "2026-11-11", target: 2150, targetFor });
  assert.equal(w.vsTarget, -5); assert.equal(w.target, 2255);           // (−60 + 50) / 2 · (2,360 + 2,150) / 2
});
test("weekly report: food against each day's target; the check-in against what you were asked to eat", () => {
  const days = [];
  for (let i = 0; i < 28; i++) {
    const burn = 2500 + (i % 3) * 100;
    days.push({ date: new Date(Date.UTC(2026, 10, 14) - i * 864e5).toISOString().slice(0, 10), kcal_in: burn - 240, protein_g: 160, burn_kcal: burn, burn_source: "watch" });
  }
  const weights = [{ date: "2026-10-18", weight: 86 }, { date: "2026-10-25", weight: 85.95 }, { date: "2026-11-01", weight: 85.9 }, { date: "2026-11-08", weight: 85.85 }, { date: "2026-11-14", weight: 85.8 }];
  const data = { days, weights, inbody: [], sessions: [], logs: [], goal: ciGoal };
  const targetFor = (burn) => (burn ? { kcal: burn - 240, live: true, adjust: -240 } : { kcal: 2150, live: false });
  const args = { week: reportWeek("2026-11-15"), data, profile: ciProfile, body: { weight: 85.8 }, current: 2150, protein: 170 };
  const r = weeklyReport({ ...args, targetFor, adjust: -240 });
  assert.equal(r.food.liveDays, 7);
  assert.equal(r.food.target, r.food.kcal);                              // you ate each day's target
  assert.ok(!r.recs.some((x) => x.k === "recEatOver" || x.k === "recEatUnder"), r.recs.map((x) => x.k).join());
  assert.deepEqual([r.checkin.live, r.checkin.adjust, r.checkin.current], [true, -240, r.food.target]);   // not the 2,150 plan
  const text = docText(reportDoc(r, { t: makeT("en"), lang: "en", name: "" }));
  assert.ok(/your target (becomes your burn|\(your burn) −/.test(text), text.slice(text.indexOf("## Calorie")));
  const plan = weeklyReport(args);                                       // no watch: the plan, as before
  assert.deepEqual([plan.food.target, plan.checkin.live, plan.checkin.current ?? 2150], [2150, false, 2150]);
});
test("rest beep mixes with your music (never pauses it) and lets go of the audio after", () => {
  const calls = [];
  class FakeAC {
    constructor() { this.state = "running"; this.currentTime = 0; this.destination = {}; }
    resume() { this.state = "running"; calls.push("resume"); }
    suspend() { this.state = "suspended"; calls.push("suspend"); }
    createOscillator() { return { type: "", frequency: {}, connect: (g) => g, start() {}, stop() {} }; }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: (d) => d }; }
  }
  const session = { type: "auto" };
  Object.defineProperty(globalThis.navigator, "audioSession", { value: session, configurable: true });
  globalThis.window = { AudioContext: FakeAC };
  try {
    primeSound();
    assert.equal(session.type, "ambient");            // "playback" would stop the music
    scheduleBeep(Date.now() + 60000);
    assert.equal(session.type, "ambient");
    cancelBeep();
    assert.deepEqual(calls, ["suspend"]);             // audio off again once nothing is waiting
    primeSound();
    assert.equal(calls.at(-1), "resume");             // the next ✓ tap wakes it
    cancelBeep();
  } finally {
    delete globalThis.window;
    delete globalThis.navigator.audioSession;
  }
});
test("no text field under 16px (iPhone zooms the whole page into smaller ones)", () => {
  const css = readFileSync("src/styles.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const bad = [...css.matchAll(/([^{}]*\b(?:input|textarea|select)\b[^{}]*)\{([^}]*)\}/g)]
    .filter(([, , body]) => { const m = body.match(/font-size:\s*(\d+(?:\.\d+)?)px/); return m && +m[1] < 16; })
    .map(([, sel]) => sel.trim());
  assert.deepEqual(bad, []);
  for (const f of ["src/screens/Train.jsx", "src/sheets/AddExercise.jsx", "src/sheets/Sheets.jsx"]) {
    const src = readFileSync(f, "utf8");
    assert.ok(!/<input[^>]*fontSize:\s*1[0-5]\b/.test(src), f);
  }
});

// ── Every text exists in both languages ──
test("every t(\"key\") used in the app exists in English and Arabic", () => {
  const files = [];
  const walk = (d) => readdirSync(d).forEach((f) => { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : /\.(jsx?|mjs)$/.test(f) && files.push(p); });
  walk("src");
  files.splice(files.findIndex((f) => f.endsWith("i18n.js")), 1);
  const keys = new Set();
  files.forEach((f) => { for (const m of readFileSync(f, "utf8").matchAll(/\bt\("([A-Za-z0-9_]+)"/g)) keys.add(m[1]); });
  // Keys built at runtime
  ["plStep1", "plStep2", "plStep3", "plNext1", "plNext2", "plNext3", "plFoot1", "plFoot2", "plFoot3",
   ...["up", "same", "hold", "stall", "down", "fresh", "reps"].flatMap((k) => [`rec_${k}`, `recT_${k}`]),
   ...["onTrack", "slower", "faster", "gainSlow", "gainFast", "muscleDown", "protein", "logFood", "rescan"].map((k) => `tip_${k}`),
   "painShoulder", "painBack", "painKnee", "painWrist", "pr_weight", "pr_e1rm", "pr_reps", "sumMore", "sumLess", "ph_front", "ph_side", "ph_back", "ciWhyDown", "ciWhyUp", "ciNeedFood", "ciNeedWeight", "ciEarly", "ciNoGoal", "easy", "ok", "hard", "waist", "chest", "hips", "arms", "thighs",
   "mWeight", "mFat", "mMuscle", "goalLose", "goalGain", "goalRecomp", "goalMaintain", "tagOk", "tagWarn", "tagBad", "tagDone",
  ].forEach((k) => keys.add(k));
  const missing = [...keys].filter((k) => STR.en[k] === undefined || STR.ar[k] === undefined);
  assert.deepEqual(missing, []);
});
test("English and Arabic have the same keys and placeholders", () => {
  const en = Object.keys(STR.en), ar = Object.keys(STR.ar);
  assert.deepEqual(en.filter((k) => !ar.includes(k)), []);
  assert.deepEqual(ar.filter((k) => !en.includes(k)), []);
  const ph = (s) => (typeof s === "string" ? [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",") : "");
  const bad = en.filter((k) => ph(STR.en[k]) !== ph(STR.ar[k]));
  assert.deepEqual(bad, []);
});

await Promise.all(pending);
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
