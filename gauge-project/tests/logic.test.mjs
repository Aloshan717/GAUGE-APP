// GAUGE — logic tests. Run with: npm test   (or: node tests/logic.test.mjs)
import assert from "node:assert/strict";
import {
  coerceNumber, normalizeDate, extractJSON, parseScanResponse,
  mergeWeightSeries, chartLabels, computePace, analyseMetric, calcCalories,
  averageDailyBurn, weekSummary,
  tokenExpiry, tokenNeedsRefresh, isJwtError, isFatalRefreshFailure,
  EMPTY_DATA, mergeLoadedData, parseCachedData,
  SESSION_MUSCLES, WORKOUT_MUSCLES, workoutMuscleTabs,
  proteinRange, directionFor, goalStartDate, baselineAt, composition,
  weightTrend, coachAnalysis, averageDayBurn, RATE_BANDS, SOURCES,
} from "../src/logic.js";

let passed = 0, failed = 0;
const test = (name, fn) => {
  try { fn(); passed++; }
  catch (e) { failed++; console.error(`✗ ${name}\n   ${e.message}`); }
};

// helper: build an unsigned JWT with a given payload (base64url, no padding)
const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64")
  .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const jwt = (payload) => `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url(payload)}.sig`;

const DAY = 86400000;
const NOW = Date.UTC(2026, 8, 26, 12, 0, 0);

// ─── existing behaviour (regression) ─────────────────────────────────────────
test("coerceNumber strips units", () => {
  assert.equal(coerceNumber("88.45 kg"), 88.45);
  assert.equal(coerceNumber("21,5%"), 21.5);
  assert.equal(coerceNumber({ value: "40" }), 40);
  assert.equal(coerceNumber("n/a"), null);
  assert.equal(coerceNumber(null), null);
  assert.equal(coerceNumber(true), null);
});

test("normalizeDate handles common formats", () => {
  assert.equal(normalizeDate("2026-03-04"), "2026-03-04");
  assert.equal(normalizeDate("04/03/2026"), "2026-03-04");
  assert.equal(normalizeDate("2026/03/04"), "2026-03-04");
  assert.equal(normalizeDate("garbage"), null);
});

test("extractJSON finds JSON inside prose and fences", () => {
  assert.deepEqual(extractJSON('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(extractJSON('Here you go: {"a":{"b":2}} thanks'), { a: { b: 2 } });
  assert.equal(extractJSON("no json"), null);
});

test("parseScanResponse tolerates camelCase + units", () => {
  const r = parseScanResponse({ content: [{ text: '{"bodyWeight":"88.4 kg","bodyFat":"22%","skeletalMuscleMass":"40.1"}' }] }, "2026-01-01");
  assert.equal(r.ok, true);
  assert.equal(r.data.weight, 88.4);
  assert.equal(r.data.body_fat, 22);
  assert.equal(r.data.muscle_mass, 40.1);
  assert.equal(r.data.date, "2026-01-01");
  assert.equal(parseScanResponse({ error: "boom" }).ok, false);
  assert.equal(parseScanResponse({ content: [{ text: '{"weight":null}' }] }).ok, false);
});

test("mergeWeightSeries prefers manual on same date and sorts", () => {
  const s = mergeWeightSeries(
    [{ id: 1, date: "2026-01-03", weight: 90 }],
    [{ date: "2026-01-03", weight: 91 }, { date: "2026-01-01", weight: "92 kg" }],
  );
  assert.deepEqual(s.map((x) => [x.date, x.weight, x.source]), [
    ["2026-01-01", 92, "scan"], ["2026-01-03", 90, "manual"],
  ]);
});

test("chartLabels: day labels for short spans, months for long", () => {
  const a = Date.UTC(2026, 0, 1), b = a + 10 * DAY;
  const short = chartLabels(a, b, [a, a + 5 * DAY, b]);
  assert.ok(short.length >= 2 && /\d+ JAN/.test(short[0].text));
  const long = chartLabels(a, a + 200 * DAY, [a]);
  assert.ok(long.every((l) => /^[A-Z]{3}$/.test(l.text)));
  assert.deepEqual(chartLabels(b, a), []);
});

test("computePace: reached / just started / on track", () => {
  assert.equal(computePace({ curr: 80, start: 90, target: 80, startDate: "2026-01-01", targetDate: "2026-12-01", goodDirection: -1, now: NOW }).status, "Target reached");
  assert.equal(computePace({ curr: 89, start: 90, target: 80, startDate: "2026-09-20", targetDate: "2026-12-01", goodDirection: -1, now: NOW }).status, "Just started");
  const p = computePace({ curr: 83, start: 90, target: 80, startDate: "2026-07-01", targetDate: "2026-11-15", goodDirection: -1, now: NOW });
  assert.equal(p.status, "On track");
  assert.equal(computePace({ curr: null, target: 1, targetDate: "2026-12-01" }), null);
});

test("analyseMetric describes direction", () => {
  const a = analyseMetric({ label: "Body fat", curr: 20, prev: 21, first: 24, target: 18, targetDate: "2026-12-26", goodDirection: -1, unit: "%", now: NOW });
  assert.match(a.lines[0], /right way/);
  assert.equal(a.delta, -1);
});

test("calcCalories: recomp uses 250 deficit and protein in the 1.6–2.2 g/kg range", () => {
  const c = calcCalories({ weight: 90, height: 180, age: 40, gender: "male", activity: "moderate", goalDirection: "recomp" });
  assert.equal(c.adjustment, -250);
  assert.equal(c.protein, 171); // midpoint of 144–198 g
  assert.deepEqual([c.proteinRange.low, c.proteinRange.high], [144, 198]);
  assert.equal(calcCalories({ weight: 90 }), null);
});

test("sessions: averageDailyBurn + weekSummary", () => {
  const sessions = [
    { date: new Date(NOW - 1 * DAY).toISOString(), kcal: 700, duration_min: 60 },
    { date: new Date(NOW - 3 * DAY).toISOString(), kcal: "700 kcal", duration_min: 30 },
    { date: new Date(NOW - 30 * DAY).toISOString(), kcal: 999 },
  ];
  assert.equal(averageDailyBurn(sessions, 14, NOW), 100);
  assert.deepEqual(weekSummary(sessions, NOW), { count: 2, minutes: 90, kcal: 1400, dayBurnAvg: null });
});

// ─── NEW: session never silently dies ────────────────────────────────────────
test("tokenExpiry decodes base64url payloads (incl. - and _)", () => {
  const exp = Math.floor(NOW / 1000) + 3600;
  // a payload that encodes to base64 containing + and / (→ - and _ in base64url)
  const tok = jwt({ exp, sub: "???>>>~~~", email: "a?b>c@x.io" });
  assert.ok(/[-_]/.test(tok.split(".")[1]), "fixture should contain base64url chars");
  assert.equal(tokenExpiry(tok), exp * 1000);
  assert.equal(tokenExpiry("not.a.jwt"), null);
  assert.equal(tokenExpiry(null), null);
  assert.equal(tokenExpiry(jwt({ sub: "x" })), null);
});

test("tokenNeedsRefresh: fresh vs near-expiry vs unknown", () => {
  const exp = (s) => jwt({ exp: Math.floor(NOW / 1000) + s });
  assert.equal(tokenNeedsRefresh(exp(3600), NOW), false);
  assert.equal(tokenNeedsRefresh(exp(60), NOW), true);      // within 2-minute margin
  assert.equal(tokenNeedsRefresh(exp(-10), NOW), true);     // already expired
  assert.equal(tokenNeedsRefresh("garbage", NOW), true);
  assert.equal(tokenNeedsRefresh(exp(60), NOW, 0), false);  // margin 0 → still valid
});

test("isJwtError recognises PostgREST and GoTrue JWT failures only", () => {
  assert.equal(isJwtError(401, { code: "PGRST303", message: "JWT expired" }), true);
  assert.equal(isJwtError(401, { message: "JWT issued at future" }), true);
  assert.equal(isJwtError(403, { code: 403, error_code: "bad_jwt", msg: "invalid JWT: token is expired" }), true);
  assert.equal(isJwtError(400, { code: "42703", message: "column goals.date does not exist" }), false);
  assert.equal(isJwtError(409, { code: "23505", message: "duplicate key value" }), false);
});

test("isFatalRefreshFailure: only a rejected refresh token ends the session", () => {
  // temporary — keep the user signed in
  assert.equal(isFatalRefreshFailure(null, null), false);            // offline
  assert.equal(isFatalRefreshFailure(500, {}), false);
  assert.equal(isFatalRefreshFailure(503, { message: "project paused" }), false);
  assert.equal(isFatalRefreshFailure(540, {}), false);
  assert.equal(isFatalRefreshFailure(429, { msg: "rate limited" }), false);
  assert.equal(isFatalRefreshFailure(403, { message: "forbidden by WAF" }), false);
  // real end of session
  assert.equal(isFatalRefreshFailure(400, { code: 400, error_code: "refresh_token_not_found", msg: "Invalid Refresh Token: Refresh Token Not Found" }), true);
  assert.equal(isFatalRefreshFailure(400, { error: "invalid_grant", error_description: "Invalid Refresh Token: Already Used" }), true);
  assert.equal(isFatalRefreshFailure(403, { error_code: "session_not_found" }), true);
});

test("mergeLoadedData: failed tables keep what was on screen", () => {
  const prev = { ...EMPTY_DATA, weights: [{ id: 1 }], sessions: [{ id: 9 }], goal: { id: "g1" } };
  const next = mergeLoadedData(prev, {
    weights: { message: "JWT expired" },          // failed
    inbody: [{ id: 2 }],                          // ok
    measurements: [], logs: [],
    sessions: { network: true },                  // failed
    goals: { message: "timeout" },                // failed
  });
  assert.deepEqual(next.weights, [{ id: 1 }]);
  assert.deepEqual(next.sessions, [{ id: 9 }]);
  assert.deepEqual(next.inbody, [{ id: 2 }]);
  assert.deepEqual(next.goal, { id: "g1" });
});

test("mergeLoadedData: successful empty results do replace (real deletions show)", () => {
  const prev = { ...EMPTY_DATA, weights: [{ id: 1 }], goal: { id: "g1" } };
  const next = mergeLoadedData(prev, { weights: [], goals: [] });
  assert.deepEqual(next.weights, []);
  assert.equal(next.goal, null);
  assert.equal(mergeLoadedData(prev, { goals: [{ id: "g2" }, { id: "g1" }] }).goal.id, "g2");
});

test("mergeLoadedData: total failure changes nothing", () => {
  const prev = { weights: [{ id: 1 }], inbody: [{ id: 2 }], measurements: [{ id: 3 }], logs: [{ id: 4 }], sessions: [{ id: 5 }], goal: { id: 6 } };
  const fail = { network: true, message: "No connection" };
  const next = mergeLoadedData(prev, { weights: fail, inbody: fail, measurements: fail, logs: fail, sessions: fail, goals: fail });
  assert.deepEqual(next, prev);
});

test("parseCachedData: round-trips and survives corruption", () => {
  const data = { weights: [{ id: 1, weight: 88 }], inbody: [], measurements: [], logs: [], sessions: [{ id: 3 }], goal: { id: "g" } };
  assert.deepEqual(parseCachedData(JSON.stringify(data)), data);
  assert.equal(parseCachedData("{broken"), null);
  assert.equal(parseCachedData(null), null);
  assert.deepEqual(parseCachedData(JSON.stringify({ weights: "nope" })), { ...EMPTY_DATA });
});

// ─── NEW: Biceps / Triceps ───────────────────────────────────────────────────
test("session muscle list has Biceps + Triceps and no Arms", () => {
  assert.ok(SESSION_MUSCLES.includes("Biceps"));
  assert.ok(SESSION_MUSCLES.includes("Triceps"));
  assert.ok(!SESSION_MUSCLES.includes("Arms"));
  assert.ok(SESSION_MUSCLES.includes("Cardio"));
  assert.equal(new Set(SESSION_MUSCLES).size, SESSION_MUSCLES.length);
});

test("workout tabs: Biceps/Triceps; legacy Arms only while old sets exist", () => {
  assert.deepEqual(workoutMuscleTabs([]), WORKOUT_MUSCLES);
  assert.ok(!workoutMuscleTabs([{ muscle_group: "Chest" }]).includes("Arms"));
  const withLegacy = workoutMuscleTabs([{ muscle_group: "Arms" }]);
  assert.equal(withLegacy[withLegacy.length - 1], "Arms");
  assert.ok(withLegacy.includes("Biceps") && withLegacy.includes("Triceps"));
  assert.ok(!WORKOUT_MUSCLES.includes("Arms"));
});

// ─── NEW: goal start date + baseline (pace fix) ──────────────────────────────
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const daysAgo = (n) => iso(NOW - n * DAY);
// weigh-ins every `every` days from `fromDaysAgo` to today, changing `perWeek` kg/week
const series = (fromDaysAgo, startW, perWeek, every = 2) => {
  const out = [];
  for (let d = fromDaysAgo; d >= 0; d -= every) {
    out.push({ date: daysAgo(d), weight: +(startW + perWeek * ((fromDaysAgo - d) / 7)).toFixed(2) });
  }
  return out;
};

test("goalStartDate: start_date, else created_at, else null", () => {
  assert.equal(goalStartDate({ start_date: "2026-09-01", created_at: "2026-08-01T10:00:00Z" }), "2026-09-01");
  assert.equal(goalStartDate({ created_at: "2026-08-15T22:10:00+00:00" }), "2026-08-15");
  assert.equal(goalStartDate({}), null);
  assert.equal(goalStartDate(null), null);
});

test("baselineAt: reading closest to the goal start, not the first ever", () => {
  const s = [
    { date: "2026-05-01", weight: 95 }, // months before the goal — must NOT be the baseline
    { date: "2026-08-28", weight: 90 },
    { date: "2026-09-04", weight: 89.4 },
  ];
  assert.deepEqual(baselineAt(s, "weight", "2026-08-30"), { date: "2026-08-28", value: 90 });
  assert.deepEqual(baselineAt(s, "weight", "2026-09-03"), { date: "2026-09-04", value: 89.4 });
  assert.deepEqual(baselineAt(s, "weight", null), { date: "2026-05-01", value: 95 });
  assert.equal(baselineAt([], "weight", "2026-09-01"), null);
  // tie → earlier reading
  assert.equal(baselineAt([{ date: "2026-09-01", weight: 1 }, { date: "2026-09-05", weight: 2 }], "weight", "2026-09-03").value, 1);
});

test("pace uses the goal's clock: old history no longer inflates elapsed time", () => {
  // Goal set 10 days ago with a 60-day window; old readings from months ago exist.
  const start = daysAgo(10), end = iso(NOW + 50 * DAY);
  const p = computePace({ curr: 89, start: 90, target: 85, startDate: start, targetDate: end, goodDirection: -1, now: NOW });
  assert.equal(p.status, "Just started"); // 10 days in — not "Behind"
  assert.ok(p.elapsed > 15 && p.elapsed < 20, `elapsed ${p.elapsed}`); // ~10 of 60 days
});

// ─── NEW: InBody-driven coach ────────────────────────────────────────────────
test("composition: fat, fat-free and muscle in kg", () => {
  assert.deepEqual(composition({ date: "2026-09-01", weight: 90, body_fat: 25, muscle_mass: 40 }),
    { date: "2026-09-01", weight: 90, bf: 25, smmPct: 40, fm: 22.5, ffm: 67.5, smmKg: 36 });
  assert.equal(composition({ date: "2026-09-01" }), null);
});

test("weightTrend: regression over recent weigh-ins; needs 3+ points over 10+ days", () => {
  const t = weightTrend(series(28, 92, -0.9), NOW);
  assert.ok(Math.abs(t.kgPerWeek + 0.9) < 0.05, `got ${t.kgPerWeek}`);
  assert.equal(weightTrend(series(6, 92, -0.9), NOW), null); // span < 10 days
  assert.equal(weightTrend([{ date: daysAgo(20), weight: 90 }, { date: daysAgo(0), weight: 89 }], NOW), null);
});

test("proteinRange follows the sources", () => {
  assert.deepEqual(proteinRange("cut", 90, 67.5), { low: 155, high: 209, basis: "2.3–3.1 g/kg fat-free mass", source: "helms2014" });
  assert.deepEqual([proteinRange("build", 90).low, proteinRange("build", 90).high], [144, 198]);
  assert.equal(proteinRange("build", 90).source, "iraki2019");
  assert.equal(directionFor("cut"), "lose");
  assert.equal(directionFor("build"), "gain");
});

const scan = (dAgo, weight, body_fat, muscle_mass) => ({ date: daysAgo(dAgo), weight, body_fat, muscle_mass });

test("coach · cut losing too slowly → eat less", () => {
  const weights = series(28, 90.8, -0.2);
  const r = coachAnalysis({ goalType: "cut", scans: [scan(28, 90.8, 25, 40), scan(0, 90, 24.8, 40.3)], weights, now: NOW });
  assert.ok(r.kcalAdjust < 0 && r.kcalAdjust >= -300, `kcal ${r.kcalAdjust}`);
  assert.ok(r.actions.some((a) => a.kind === "calories" && /less/.test(a.text)));
  assert.equal(r.status, "warn");
  assert.ok(r.sourcesUsed.includes("helms2014"));
});

test("coach · cut inside 0.5–1%/wk → no calorie change", () => {
  const weights = series(28, 92.8, -0.7);
  const r = coachAnalysis({ goalType: "cut", scans: [scan(28, 92.8, 25, 40), scan(0, 90, 23.6, 41.1)], weights, now: NOW });
  assert.equal(r.kcalAdjust, 0);
  assert.ok(r.findings.some((f) => f.tone === "ok"));
});

test("coach · cut too fast → add calories", () => {
  const weights = series(28, 94.8, -1.2);
  const r = coachAnalysis({ goalType: "cut", scans: [scan(0, 90, 24, 40)], weights, now: NOW });
  assert.equal(r.kcalAdjust, 150);
});

test("coach · cut target date too aggressive → suggests a realistic date", () => {
  const weights = series(28, 91, -0.7);
  const goal = { goal_type: "cut", target_weight: 80, target_date: iso(NOW + 21 * DAY) };
  const r = coachAnalysis({ goal, scans: [scan(0, 90, 24, 40)], weights, now: NOW });
  assert.ok(r.actions.some((a) => a.kind === "goal"));
});

test("coach · cut with muscle loss beyond noise → protein to the top of range", () => {
  const weights = series(28, 92.8, -0.7);
  // 40% of 92.8 = 37.12 kg → 39% of 90 = 35.1 kg : −2 kg muscle
  const r = coachAnalysis({ goalType: "cut", scans: [scan(28, 92.8, 25, 40), scan(0, 90, 24.5, 39)], weights, now: NOW });
  assert.equal(r.status, "bad");
  assert.ok(r.actions.some((a) => a.kind === "protein" && /top/.test(a.text)));
  assert.ok(r.actions.some((a) => a.kind === "training"));
  assert.ok(r.kcalAdjust > 0);
});

test("coach · build not gaining + muscle flat 35 days → more protein and calories", () => {
  const weights = series(35, 80, 0, 3);
  const r = coachAnalysis({ goalType: "build", scans: [scan(35, 80, 15, 45), scan(0, 80, 15, 45.1)], weights, now: NOW });
  assert.ok(r.kcalAdjust > 0);
  assert.ok(r.actions.some((a) => a.kind === "protein" && /1\.6–2\.2/.test(a.text)));
  assert.ok(r.findings.some((f) => /hasn't moved/.test(f.text)));
});

test("coach · build gaining too fast → trim", () => {
  const weights = series(28, 78, 0.8);
  const r = coachAnalysis({ goalType: "build", scans: [scan(0, 81.2, 16, 44)], weights, now: NOW });
  assert.ok(r.kcalAdjust < 0);
});

test("coach · recomposition working → keep going", () => {
  const weights = series(35, 85, 0);
  // fat 85*0.22=18.7 → 85*0.20=17.0 (−1.7 kg); muscle 85*0.42=35.7 → 85*0.43=36.55 (+0.85 kg)
  const r = coachAnalysis({ goalType: "recomp", scans: [scan(35, 85, 22, 42), scan(0, 85, 20, 43)], weights, now: NOW });
  assert.equal(r.kcalAdjust, 0);
  assert.ok(r.findings.some((f) => /recomposition is working/.test(f.text)));
});

test("coach · no goal type / no scans / scans too close", () => {
  assert.equal(coachAnalysis({ scans: [scan(0, 90, 24, 40)], weights: [], now: NOW }).status, "no-goal");
  assert.equal(coachAnalysis({ goalType: "cut", scans: [], weights: [], now: NOW }).status, "no-data");
  const r = coachAnalysis({ goalType: "cut", scans: [scan(5, 90.5, 24, 40), scan(0, 90, 24, 40)], weights: [], now: NOW });
  assert.equal(r.prev, null);
  assert.ok(r.findings.some((f) => /2 weeks apart/.test(f.text)));
});

test("coach bands match the cited ranges", () => {
  assert.deepEqual([RATE_BANDS.cut.min, RATE_BANDS.cut.max], [-1.0, -0.5]);
  assert.deepEqual([RATE_BANDS.build.min, RATE_BANDS.build.max], [0.25, 0.5]);
  assert.ok(SOURCES.helms2014 && SOURCES.iraki2019 && SOURCES.morton2018);
});

test("coach · cut too slow AND losing muscle → hold calories, fix protein/training first", () => {
  const weights = series(28, 92, -0.2);
  const r = coachAnalysis({ goalType: "cut", scans: [scan(28, 92, 25, 40), scan(0, 91.2, 24.8, 39.2)], weights, now: NOW });
  assert.equal(r.kcalAdjust, 0);
  const cal = r.actions.filter((a) => a.kind === "calories");
  assert.equal(cal.length, 1);
  assert.match(cal[0].text, /Hold calories/);
});

test("coach · never gives two calorie instructions", () => {
  const cases = [
    ["cut", series(28, 92, -0.2), [scan(28, 92, 25, 40), scan(0, 91.2, 24.8, 39.2)]],
    ["build", series(28, 78, 0.8), [scan(35, 78, 15, 45), scan(0, 81.2, 18, 44)]],
    ["recomp", series(35, 84, 0.5), [scan(35, 84, 22, 42), scan(0, 86.5, 23.5, 40.5)]],
    ["recomp", series(35, 88, -1.0), [scan(35, 88, 22, 42), scan(0, 83, 21, 41)]],
  ];
  for (const [goalType, weights, scans] of cases) {
    const r = coachAnalysis({ goalType, scans, weights, now: NOW });
    assert.equal(r.actions.filter((a) => a.kind === "calories").length, 1, goalType);
  }
});

// ─── NEW: whole-day burn ─────────────────────────────────────────────────────
test("averageDayBurn: one value per day, recent only, ignores empty", () => {
  const s = [
    { date: daysAgo(1), day_kcal: 2800 },
    { date: daysAgo(1), day_kcal: 2900 }, // same day → latest wins
    { date: daysAgo(3), day_kcal: "2500 kcal" },
    { date: daysAgo(4), day_kcal: 0 },
    { date: daysAgo(4), kcal: 600 }, // old per-session field is not a day total
    { date: daysAgo(30), day_kcal: 4000 }, // outside window
  ];
  assert.deepEqual(averageDayBurn(s, 14, NOW), { avg: 2700, days: 2 });
  assert.equal(averageDayBurn([], 14, NOW), null);
});

test("calcCalories: InBody fat-free mass → Katch–McArdle, no age/height needed", () => {
  const c = calcCalories({ weight: 90, ffm: 67.5, activity: "moderate", goalDirection: "lose" });
  assert.equal(c.bmr, Math.round(370 + 21.6 * 67.5));
  assert.match(c.bmrMethod, /Katch/);
  assert.equal(c.adjustment, -750); // 0.75%/wk of 90 kg ≈ 743 → 750
  assert.deepEqual([c.proteinRange.low, c.proteinRange.high], [155, 209]);
  const withBurn = calcCalories({ weight: 90, ffm: 67.5, activity: "moderate", dayBurn: 3000, goalDirection: "maintain" });
  assert.equal(withBurn.tdee, Math.round((370 + 21.6 * 67.5) * 1.55 * 0.6 + 3000 * 0.4));
  assert.equal(calcCalories({ weight: 90, activity: "moderate" }), null);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
