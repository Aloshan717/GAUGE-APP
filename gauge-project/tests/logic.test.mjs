// GAUGE — logic tests. Run with: npm test   (or: node tests/logic.test.mjs)
import assert from "node:assert/strict";
import {
  coerceNumber, normalizeDate, extractJSON, parseScanResponse,
  mergeWeightSeries, chartLabels, computePace, analyseMetric, calcCalories,
  averageDailyBurn, weekSummary,
  tokenExpiry, tokenNeedsRefresh, isJwtError, isFatalRefreshFailure,
  EMPTY_DATA, mergeLoadedData, parseCachedData,
  SESSION_MUSCLES, WORKOUT_MUSCLES, workoutMuscleTabs,
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

test("calcCalories: recomp uses 250 deficit and 2.2 g/kg protein", () => {
  const c = calcCalories({ weight: 90, height: 180, age: 40, gender: "male", activity: "moderate", goalDirection: "recomp" });
  assert.equal(c.adjustment, -250);
  assert.equal(c.protein, 198);
  assert.equal(calcCalories({ weight: 90 }), null);
});

test("sessions: averageDailyBurn + weekSummary", () => {
  const sessions = [
    { date: new Date(NOW - 1 * DAY).toISOString(), kcal: 700, duration_min: 60 },
    { date: new Date(NOW - 3 * DAY).toISOString(), kcal: "700 kcal", duration_min: 30 },
    { date: new Date(NOW - 30 * DAY).toISOString(), kcal: 999 },
  ];
  assert.equal(averageDailyBurn(sessions, 14, NOW), 100);
  assert.deepEqual(weekSummary(sessions, NOW), { count: 2, minutes: 90, kcal: 1400 });
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

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
