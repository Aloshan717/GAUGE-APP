// GAUGE — pure logic
// Every decision the app makes lives here as a pure function, so tests can
// exercise it directly and a change to one feature can't silently break another.

export const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const fmt = (d) => {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export const pct = (done, total) =>
  Math.min(100, Math.max(0, (done / total) * 100)).toFixed(1) + "%";

// ─── SCAN PARSING ────────────────────────────────────────────────────────────

// Models don't always return exactly the JSON shape we asked for. They may wrap
// it in prose, use camelCase, attach units, or nest it. Being strict here means
// a perfectly good reading gets thrown away, which is what "it didn't read the
// weight" looks like from the outside.
export function coerceNumber(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return isFinite(v) ? v : null;
  if (typeof v === "boolean") return null;

  if (typeof v === "object") {
    if ("value" in v) return coerceNumber(v.value);
    return null;
  }

  if (typeof v === "string") {
    const s = v.trim();
    if (!s || /^(null|n\/?a|none|-|—)$/i.test(s)) return null;
    const cleaned = s.replace(/,(\d{1,2})\b/, ".$1").replace(/[^0-9.-]/g, "");
    if (!cleaned || cleaned === "-" || cleaned === ".") return null;
    const n = parseFloat(cleaned);
    return isFinite(n) ? n : null;
  }
  return null;
}

export function normalizeDate(v) {
  if (!v || typeof v !== "string") return null;
  const s = v.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{2})[/.](\d{2})[/.](\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = s.match(/^(\d{4})[/.](\d{2})[/.](\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

const KEY_ALIASES = {
  weight:      ["weight", "bodyweight", "body_weight", "bodyWeight", "wt", "mass"],
  body_fat:    ["body_fat", "bodyFat", "bodyfat", "body_fat_percentage", "bodyFatPercentage",
                "pbf", "percent_body_fat", "fat_percent", "fatPercent", "body_fat_percent"],
  muscle_mass: ["muscle_mass", "muscleMass", "musclemass", "skeletal_muscle_mass", "skeletalMuscleMass",
                "smm", "muscle", "muscle_percentage", "musclePercentage", "lean_body_mass", "leanBodyMass"],
  date:        ["date", "scan_date", "scanDate", "test_date", "testDate", "measured_at"],
};

function pick(obj, aliases) {
  for (const k of aliases) {
    if (obj[k] !== undefined) return obj[k];
  }
  const lower = {};
  for (const k of Object.keys(obj)) lower[k.toLowerCase().replace(/[^a-z]/g, "")] = obj[k];
  for (const k of aliases) {
    const norm = k.toLowerCase().replace(/[^a-z]/g, "");
    if (lower[norm] !== undefined) return lower[norm];
  }
  return undefined;
}

export function extractJSON(text) {
  if (!text || typeof text !== "string") return null;
  let s = text.trim();
  s = s.replace(/```(?:json)?/gi, "").trim();

  try { return JSON.parse(s); } catch { /* fall through */ }

  const start = s.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}") {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(s.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

export function parseScanResponse(apiResponse, fallbackDate) {
  if (!apiResponse) return { ok: false, error: "No response from the reader." };
  if (apiResponse.error) {
    const e = apiResponse.error;
    return { ok: false, error: typeof e === "string" ? e : (e.message || "Reader failed.") };
  }

  const blocks = Array.isArray(apiResponse.content) ? apiResponse.content : [];
  const text = blocks.map((c) => (c && typeof c.text === "string" ? c.text : "")).join("").trim();
  if (!text) return { ok: false, error: "The reader returned an empty response." };

  let obj = extractJSON(text);
  if (!obj || typeof obj !== "object") {
    return { ok: false, error: `Could not read the numbers: ${text.slice(0, 100)}` };
  }

  if (!pick(obj, KEY_ALIASES.weight) && !pick(obj, KEY_ALIASES.body_fat)) {
    const nested = Object.values(obj).find((v) => v && typeof v === "object" && !Array.isArray(v));
    if (nested) obj = nested;
  }

  const data = {
    date:        normalizeDate(pick(obj, KEY_ALIASES.date)) || fallbackDate,
    weight:      coerceNumber(pick(obj, KEY_ALIASES.weight)),
    body_fat:    coerceNumber(pick(obj, KEY_ALIASES.body_fat)),
    muscle_mass: coerceNumber(pick(obj, KEY_ALIASES.muscle_mass)),
  };

  if (data.weight == null && data.body_fat == null && data.muscle_mass == null) {
    return { ok: false, error: "No readable values found in that image. Try a clearer photo." };
  }

  return { ok: true, data };
}

// ─── WEIGHT SERIES ───────────────────────────────────────────────────────────

// A weigh-in is a weigh-in, whether typed in or read off a scan. Merging both
// sources means Home can never claim "no weight" while a scan is showing one.
export function mergeWeightSeries(weights, inbody) {
  const byDate = new Map();
  (inbody || []).forEach((s) => {
    const w = coerceNumber(s?.weight);
    if (w != null && s.date) byDate.set(s.date, { date: s.date, weight: w, source: "scan" });
  });
  (weights || []).forEach((w) => {
    const v = coerceNumber(w?.weight);
    if (v != null && w.date) byDate.set(w.date, { date: w.date, weight: v, source: "manual", id: w.id });
  });
  return [...byDate.values()].sort((a, b) => new Date(a.date) - new Date(b.date));
}

// ─── CHART AXIS ──────────────────────────────────────────────────────────────

// Month names are wrong for a 7-day span and day labels are wrong for a year.
export function chartLabels(tMin, tMax, stamps = [], targetT = null) {
  if (!isFinite(tMin) || !isFinite(tMax) || tMax <= tMin) return [];
  const spanDays = (tMax - tMin) / 86400000;
  const dayLabel = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;

  if (spanDays <= 70) {
    const all = [...new Set([...stamps, ...(targetT ? [targetT] : [])])]
      .filter((t) => t >= tMin && t <= tMax)
      .sort((a, b) => a - b);
    if (!all.length) return [{ t: tMin, text: dayLabel(new Date(tMin)) }];
    const maxN = 4;
    const stride = all.length > maxN ? Math.ceil(all.length / maxN) : 1;
    const picked = all.filter((_, i) => i % stride === 0);
    if (picked[picked.length - 1] !== all[all.length - 1]) picked.push(all[all.length - 1]);
    return picked.map((t) => ({ t, text: dayLabel(new Date(t)) }));
  }

  const s = new Date(tMin);
  let cur = new Date(s.getFullYear(), s.getMonth(), 1).getTime();
  const months = [];
  while (cur <= tMax) {
    if (cur >= tMin) months.push(cur);
    const d = new Date(cur);
    cur = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
  }
  if (!months.length || months[0] > tMin + 86400000 * 5) months.unshift(tMin);
  const stride = months.length > 6 ? Math.ceil(months.length / 5) : 1;
  return months.filter((_, i) => i % stride === 0)
               .map((t) => ({ t, text: MONTHS[new Date(t).getMonth()] }));
}

// ─── GOAL PACE ───────────────────────────────────────────────────────────────

// Progress only means something against time. 30% done is good at week 2 and
// bad at week 10, so we compare progress made against time elapsed.
export function computePace({ curr, start, target, startDate, targetDate, goodDirection, now }) {
  if (curr == null || target == null || !targetDate) return null;

  const nowMs = now ?? Date.now();
  const tEnd = new Date(targetDate + "T00:00:00").getTime();
  const tStart = startDate ? new Date(startDate + "T00:00:00").getTime() : null;
  if (!isFinite(tEnd)) return null;

  const base = start != null ? start : curr;
  const span = target - base;
  const moved = curr - base;
  const reached = (target - curr) * goodDirection <= 0;

  let progress = span === 0 ? 100 : (moved / span) * 100;
  if (reached) progress = 100;
  progress = Math.max(0, Math.min(100, progress));

  let elapsed = null;
  if (tStart != null && tEnd > tStart) {
    elapsed = Math.max(0, Math.min(100, ((nowMs - tStart) / (tEnd - tStart)) * 100));
  }

  const daysLeft = Math.ceil((tEnd - nowMs) / 86400000);
  const daysElapsed = tStart != null ? Math.floor((nowMs - tStart) / 86400000) : 0;
  const remaining = Math.abs(+(target - curr).toFixed(1));
  const perWeek = daysLeft > 0 ? +(remaining / (daysLeft / 7)).toFixed(2) : null;

  let status, color, note;
  if (reached) {
    status = "Target reached"; color = "ok";
    note = `Hit ${target}. Nothing left to chase on this one.`;
  } else if (daysLeft < 0) {
    status = "Date passed"; color = "bad";
    note = `Target date has passed with ${remaining} still to go — worth setting a new date.`;
  } else if (moved * goodDirection < 0) {
    status = "Wrong direction"; color = "bad";
    note = `Moved away from the target since you started. ${daysLeft} days left.`;
  } else if (elapsed == null || elapsed < 15 || daysElapsed < 14) {
    // Judging pace off a fortnight or less means judging measurement noise.
    // InBody readings swing up to a full point on hydration alone.
    status = "Just started"; color = "neutral";
    note = daysElapsed < 14
      ? `${daysElapsed} days in — too early to read a trend. ${daysLeft} days to go.`
      : `Too early to judge pace reliably. ${daysLeft} days to go.`;
  } else {
    const ratio = progress / elapsed;
    if (ratio >= 0.95) {
      status = "On track"; color = "ok";
      note = `${progress.toFixed(0)}% done with ${elapsed.toFixed(0)}% of the time used.${perWeek ? ` ${perWeek}/wk keeps you on pace.` : ""}`;
    } else if (ratio >= 0.75) {
      status = "Slightly behind"; color = "warn";
      note = `${progress.toFixed(0)}% done but ${elapsed.toFixed(0)}% of the time is gone.${perWeek ? ` Needs ${perWeek}/wk to catch up.` : ""}`;
    } else {
      status = "Behind"; color = "bad";
      note = `Only ${progress.toFixed(0)}% done with ${elapsed.toFixed(0)}% of the time used.${perWeek ? ` Would need ${perWeek}/wk from here.` : ""}`;
    }
  }

  return { progress, elapsed, status, color, note, daysLeft, reached, perWeek };
}

// ─── METRIC ANALYSIS ─────────────────────────────────────────────────────────

export function analyseMetric({ label, curr, prev, first, target, targetDate, goodDirection, unit, now }) {
  if (curr == null) return null;

  const lines = [];
  const delta = prev != null ? +(curr - prev).toFixed(1) : null;
  const total = first != null ? +(curr - first).toFixed(1) : null;

  if (delta === null) {
    lines.push(`First recorded ${label.toLowerCase()} reading. The next scan will show movement.`);
  } else if (delta === 0) {
    lines.push(`No change since the last scan — holding at ${curr}${unit}.`);
  } else {
    const dir = delta > 0 ? "up" : "down";
    const helping = delta * goodDirection > 0;
    lines.push(`${helping ? "Moving the right way" : "Moving against your goal"} — ${dir} ${Math.abs(delta)}${unit} since the last scan.`);
  }

  if (total !== null && total !== 0 && first !== prev) {
    lines.push(`${total > 0 ? "Up" : "Down"} ${Math.abs(total)}${unit} in total since your first scan.`);
  }

  let progress = null;
  if (target != null) {
    const remaining = +(target - curr).toFixed(1);
    const reached = remaining * goodDirection <= 0;

    if (reached) {
      lines.push(`Target of ${target}${unit} reached.`);
      progress = 100;
    } else {
      lines.push(`${Math.abs(remaining)}${unit} to go to reach ${target}${unit}.`);
      if (first != null && target !== first) {
        progress = Math.max(0, Math.min(100, (Math.abs(curr - first) / Math.abs(target - first)) * 100));
      }
      if (targetDate) {
        const weeksLeft = (new Date(targetDate).getTime() - (now ?? Date.now())) / (86400000 * 7);
        if (weeksLeft > 0.5) {
          lines.push(`Needs about ${(Math.abs(remaining) / weeksLeft).toFixed(2)}${unit} per week to land on time.`);
        } else if (weeksLeft > 0) {
          lines.push(`Target date is this week.`);
        } else {
          lines.push(`Target date has passed — worth resetting it.`);
        }
      }
    }
  }

  return { lines, delta, total, progress };
}

// ─── EVIDENCE BASE ───────────────────────────────────────────────────────────
// Every number the coach uses comes from one of these. Shown in the app too.
export const SOURCES = {
  helms2014: "Helms, Aragon & Fitschen (2014). Evidence-based recommendations for natural bodybuilding contest preparation. J Int Soc Sports Nutr 11:20",
  iraki2019: "Iraki et al. (2019). Nutrition recommendations for bodybuilders in the off-season. Sports 7(7):154",
  morton2018: "Morton et al. (2018). Protein supplementation and resistance training gains: meta-analysis. Br J Sports Med 52:376–384",
  barakat2020: "Barakat et al. (2020). Body recomposition: can trained individuals build muscle and lose fat at the same time? Strength Cond J 42(5)",
  katch: "Katch–McArdle resting energy equation (370 + 21.6 × fat-free mass)",
  energy7700: "~7,700 kcal per kg of body-mass change (classic approximation; real-world adjustment is iterative)",
};

// Goal types the user picks in the goal form.
export const GOAL_TYPES = [
  { value: "cut", label: "Lose fat" },
  { value: "build", label: "Build muscle" },
  { value: "recomp", label: "Recomposition (lose fat + build muscle)" },
];

// Weekly body-weight change bands, % of body weight per week.
// cut: 0.5–1.0 %/wk loss to retain muscle (Helms 2014)
// build: 0.25–0.5 %/wk gain for novice–intermediate lifters (Iraki 2019)
// recomp: roughly stable weight — maintenance to a small deficit (Barakat 2020)
export const RATE_BANDS = {
  cut: { min: -1.0, max: -0.5, source: "helms2014" },
  build: { min: 0.25, max: 0.5, source: "iraki2019" },
  recomp: { min: -0.5, max: 0.1, source: "barakat2020" },
};

// Changes smaller than these, between two InBody scans, are treated as
// measurement noise (hydration, food, time of day move BIA readings).
export const NOISE = { smmKg: 0.5, fmKg: 1.0 };

const KCAL_PER_KG = 7700;
const DAY_MS = 86400000;
const round50 = (n) => Math.round(n / 50) * 50;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const dayMs = (d) => new Date(d + "T00:00:00Z").getTime();

// Protein range in grams/day for a goal type.
// cut / recomp with a known fat-free mass: 2.3–3.1 g/kg FFM (Helms 2014, energy deficit)
// otherwise: 1.6–2.2 g/kg body weight (Morton 2018; Iraki 2019)
export function proteinRange(goalType, weight, ffm) {
  if (!weight) return null;
  if ((goalType === "cut" || goalType === "recomp") && ffm) {
    return { low: Math.round(ffm * 2.3), high: Math.round(ffm * 3.1), basis: "2.3–3.1 g/kg fat-free mass", source: "helms2014" };
  }
  return { low: Math.round(weight * 1.6), high: Math.round(weight * 2.2), basis: "1.6–2.2 g/kg body weight", source: goalType === "build" ? "iraki2019" : "morton2018" };
}

// Map goal type → calorie direction used by the calculator.
export const directionFor = (goalType) =>
  goalType === "cut" ? "lose" : goalType === "build" ? "gain" : goalType === "recomp" ? "recomp" : "maintain";

// Starting-point calorie estimate. The coach then corrects it from real results.
export function calcCalories({ weight, height, age, gender, activity, dayBurn, burnKcal, ffm, goalDirection, targetWeight, targetDate, now }) {
  if (!weight) return null;

  let bmr, bmrMethod;
  if (ffm) {
    bmr = 370 + 21.6 * ffm; // Katch–McArdle, uses InBody fat-free mass
    bmrMethod = "Katch–McArdle (from your InBody fat-free mass)";
  } else if (height && age) {
    bmr = gender === "female"
      ? 10 * weight + 6.25 * height - 5 * age - 161
      : 10 * weight + 6.25 * height - 5 * age + 5;
    bmrMethod = "Mifflin–St Jeor";
  } else {
    return null;
  }

  const activityMap = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, veryActive: 1.9 };
  const tdeeFormula = bmr * (activityMap[activity] || 1.55);

  // dayBurn = your logged whole-day total (Apple Watch active + resting).
  // Wrist devices misjudge energy, so it is blended with the formula rather than trusted alone.
  const measured = dayBurn || null;
  const tdee = measured
    ? Math.round(tdeeFormula * 0.6 + measured * 0.4)
    : burnKcal
      ? Math.round(tdeeFormula * 0.6 + (bmr * 1.2 + burnKcal) * 0.4)
      : Math.round(tdeeFormula);

  // Deficit / surplus sized from the evidence-based weekly rate, not a fixed number.
  let adjustment = 0;
  let ratePct = 0;
  if (goalDirection === "lose") {
    ratePct = 0.75; // middle of 0.5–1.0 %/wk
    if (targetWeight && targetDate) {
      const weeksLeft = Math.max(1, (new Date(targetDate).getTime() - (now ?? Date.now())) / (DAY_MS * 7));
      const needed = ((weight - targetWeight) / weeksLeft / weight) * 100;
      if (needed > 0) ratePct = clamp(needed, 0.5, 1.0);
    }
    adjustment = -round50((weight * ratePct / 100) * KCAL_PER_KG / 7);
  } else if (goalDirection === "gain") {
    ratePct = 0.375; // middle of 0.25–0.5 %/wk
    adjustment = round50((weight * ratePct / 100) * KCAL_PER_KG / 7);
  } else if (goalDirection === "recomp") {
    adjustment = -250; // small deficit; large deficits blunt muscle gain
  }

  const goalType = goalDirection === "lose" ? "cut" : goalDirection === "gain" ? "build" : goalDirection === "recomp" ? "recomp" : null;
  const pr = proteinRange(goalType, weight, ffm) || { low: Math.round(weight * 1.6), high: Math.round(weight * 2.2) };
  const target = tdee + adjustment;
  const protein = Math.round((pr.low + pr.high) / 2);
  const fat = Math.round(weight * 0.9); // inside 0.5–1.5 g/kg (Iraki 2019)
  const carbs = Math.max(0, Math.round((target - protein * 4 - fat * 9) / 4));

  return { tdee, target, adjustment, ratePct, protein, proteinRange: pr, fat, carbs, bmr: Math.round(bmr), bmrMethod };
}

// ─── GOAL BASELINE ───────────────────────────────────────────────────────────

// The goal's own start date. Older goals have none, so fall back to when the
// goal was saved — never to the first reading ever logged, which is what made
// pace compare months of old progress against the new goal's clock.
export function goalStartDate(goal) {
  if (!goal) return null;
  return normalizeDate(goal.start_date) || normalizeDate(goal.created_at) || null;
}

// The reading closest to a date (ties → the earlier one). That value is the
// goal's starting point for pace.
export function baselineAt(series, field, date) {
  const pts = (series || [])
    .filter((p) => p && normalizeDate(p.date) && coerceNumber(p[field]) != null)
    .map((p) => ({ date: normalizeDate(p.date), value: coerceNumber(p[field]) }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (!pts.length) return null;
  if (!date) return pts[0];
  const target = dayMs(date);
  let best = pts[0], bestGap = Infinity;
  for (const p of pts) {
    const gap = Math.abs(dayMs(p.date) - target);
    if (gap < bestGap || (gap === bestGap && p.date < best.date)) { best = p; bestGap = gap; }
  }
  return best;
}

// ─── INBODY-DRIVEN COACH ─────────────────────────────────────────────────────

// Absolute tissue masses. Muscle % rises when fat drops even if no muscle is
// gained, so the coach judges muscle in kg, not %.
export function composition(scan) {
  const weight = coerceNumber(scan?.weight);
  if (weight == null) return null;
  const bf = coerceNumber(scan?.body_fat);
  const smmPct = coerceNumber(scan?.muscle_mass);
  const fm = bf != null ? +(weight * bf / 100).toFixed(2) : null;
  return {
    date: normalizeDate(scan.date),
    weight, bf, smmPct, fm,
    ffm: fm != null ? +(weight - fm).toFixed(2) : null,
    smmKg: smmPct != null ? +(weight * smmPct / 100).toFixed(2) : null,
  };
}

// Weekly weight trend from a least-squares line over recent weigh-ins —
// averages out day-to-day water swings (Iraki 2019: use weekly averages).
export function weightTrend(series, now = Date.now(), windowDays = 28) {
  const since = now - windowDays * DAY_MS;
  const pts = (series || [])
    .map((p) => ({ t: dayMs(normalizeDate(p?.date) || ""), w: coerceNumber(p?.weight) }))
    .filter((p) => isFinite(p.t) && p.w != null && p.t >= since && p.t <= now + DAY_MS);
  if (pts.length < 3) return null;
  const span = (Math.max(...pts.map((p) => p.t)) - Math.min(...pts.map((p) => p.t))) / DAY_MS;
  if (span < 10) return null;
  const n = pts.length;
  const mt = pts.reduce((a, p) => a + p.t, 0) / n;
  const mw = pts.reduce((a, p) => a + p.w, 0) / n;
  let num = 0, den = 0;
  for (const p of pts) { num += (p.t - mt) * (p.w - mw); den += (p.t - mt) ** 2; }
  if (!den) return null;
  const kgPerWeek = (num / den) * DAY_MS * 7;
  return { kgPerWeek: +kgPerWeek.toFixed(2), points: n, spanDays: Math.round(span) };
}

const step = (gapKgPerWeek) => clamp(round50(Math.abs(gapKgPerWeek) * KCAL_PER_KG / 7), 100, 300);

// Reads the scans + weigh-ins against the goal type and says what to change.
// Output is plain data; the UI renders it.
export function coachAnalysis({ goalType, goal, scans, weights, now = Date.now() }) {
  const type = goalType || goal?.goal_type || null;
  const sorted = (scans || [])
    .map(composition).filter(Boolean)
    .filter((c) => c.date)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  if (!sorted.length) return { status: "no-data", findings: [], actions: [], kcalAdjust: 0, sourcesUsed: [] };

  const L = sorted[sorted.length - 1];
  // Compare against a scan at least 2 weeks older — closer scans are mostly noise.
  const P = [...sorted].reverse().find((c) => dayMs(L.date) - dayMs(c.date) >= 14 * DAY_MS) || null;
  const days = P ? Math.round((dayMs(L.date) - dayMs(P.date)) / DAY_MS) : null;

  const findings = [];
  const actions = [];
  const used = new Set();
  let kcalAdjust = 0;

  if (!type) {
    return {
      status: "no-goal", findings: [{ tone: "info", text: "Pick a goal type in Weight → Set your targets so the analysis knows what to optimise for." }],
      actions: [], kcalAdjust: 0, latest: L, prev: P, sourcesUsed: [],
    };
  }

  const band = RATE_BANDS[type];
  used.add(band.source);

  // ── Weight trend vs the evidence band (and vs the goal date, for a cut) ──
  const series = mergeWeightSeries(weights, scans);
  let trend = weightTrend(series, now);
  let trendSource = "weigh-ins";
  if (!trend && P) {
    trend = { kgPerWeek: +((L.weight - P.weight) / (days / 7)).toFixed(2), points: 2, spanDays: days };
    trendSource = "scans";
  }
  const ratePct = trend ? +((trend.kgPerWeek / L.weight) * 100).toFixed(2) : null;

  let minPct = band.min, maxPct = band.max;
  if (type === "cut" && goal?.target_weight != null && goal?.target_date) {
    const weeksLeft = (dayMs(normalizeDate(goal.target_date)) - now) / (DAY_MS * 7);
    if (weeksLeft > 0) {
      const neededPct = ((goal.target_weight - L.weight) / weeksLeft / L.weight) * 100; // negative for loss
      if (neededPct < band.min) {
        const weeksAtMax = ((L.weight - goal.target_weight) / (L.weight * 0.0075));
        const d = new Date(now + weeksAtMax * 7 * DAY_MS).toISOString().slice(0, 10);
        findings.push({ tone: "warn", text: `Reaching ${goal.target_weight} kg by ${normalizeDate(goal.target_date)} needs ${Math.abs(neededPct).toFixed(1)}%/week — faster than the 1%/week ceiling for keeping muscle. A realistic date at 0.75%/week is around ${d}.` });
        actions.push({ kind: "goal", text: `Move the target date to around ${d} rather than cutting harder.` });
      } else if (neededPct < band.max) {
        maxPct = Math.max(band.min, neededPct); // needs faster than 0.5%/wk to land on time
      }
    }
  }

  const fmtPct = (x) => `${x > 0 ? "+" : ""}${x.toFixed(2)}%`;
  const kgWk = (pct) => (pct / 100) * L.weight;

  if (ratePct == null) {
    findings.push({ tone: "info", text: "Not enough weigh-ins to read a trend yet. Weigh in at least 3 times across 2 weeks (same time, morning, before food)." });
  } else {
    const bandTxt = `${band.min}% to ${band.max}% per week`;
    const where = `Weight is changing ${fmtPct(ratePct)} per week (${trend.kgPerWeek > 0 ? "+" : ""}${trend.kgPerWeek} kg, from ${trendSource}).`;

    if (type === "cut") {
      if (ratePct > maxPct) {
        const gap = kgWk(maxPct - ratePct); // kg/wk short of the slowest acceptable loss
        const s = step(gap);
        kcalAdjust = -s;
        findings.push({ tone: "warn", text: `${where} That is slower than the ${Math.abs(maxPct).toFixed(2)}%/week needed (evidence band ${bandTxt}).` });
        actions.push({ kind: "calories", text: `Eat about ${s} kcal/day less than you do now — preferably from carbs or fat, not protein. Re-check after 2 weeks.` });
      } else if (ratePct < band.min) {
        findings.push({ tone: "warn", text: `${where} That is faster than 1%/week, where muscle loss becomes likely.` });
        kcalAdjust = 150;
        actions.push({ kind: "calories", text: "Add about 150 kcal/day to slow the loss to under 1%/week." });
      } else {
        findings.push({ tone: "ok", text: `${where} Inside the evidence band for fat loss while keeping muscle (${bandTxt}).` });
      }
    } else if (type === "build") {
      if (ratePct < band.min) {
        const s = step(kgWk(band.min - ratePct));
        kcalAdjust = s;
        findings.push({ tone: "warn", text: `${where} Below the ${band.min}%/week gain that supports muscle growth (${bandTxt}).` });
        actions.push({ kind: "calories", text: `Eat about ${s} kcal/day more than you do now. Re-check after 2 weeks.` });
      } else if (ratePct > band.max) {
        const s = step(kgWk(ratePct - band.max));
        kcalAdjust = -s;
        findings.push({ tone: "warn", text: `${where} Faster than ${band.max}%/week — the extra is mostly fat.` });
        actions.push({ kind: "calories", text: `Trim about ${s} kcal/day to slow the gain.` });
      } else {
        findings.push({ tone: "ok", text: `${where} Inside the evidence band for lean gain (${bandTxt}).` });
      }
    } else if (type === "recomp") {
      if (ratePct < band.min) {
        findings.push({ tone: "warn", text: `${where} That is a real cut, not a recomposition — muscle gain stalls in larger deficits.` });
        kcalAdjust = 150;
        actions.push({ kind: "calories", text: "Add about 150 kcal/day to bring weight closer to stable." });
      } else if (ratePct > band.max) {
        findings.push({ tone: "warn", text: `${where} Weight is climbing — recomposition works best at maintenance or a small deficit.` });
        kcalAdjust = -150;
        actions.push({ kind: "calories", text: "Eat about 150 kcal/day less." });
      } else {
        findings.push({ tone: "ok", text: `${where} Roughly stable, which suits recomposition.` });
      }
    }
  }

  // ── Body composition between scans (kg, not %) ──
  const dSmm = P && L.smmKg != null && P.smmKg != null ? +(L.smmKg - P.smmKg).toFixed(2) : null;
  const dFm = P && L.fm != null && P.fm != null ? +(L.fm - P.fm).toFixed(2) : null;

  if (!P) {
    const nextIn = 14 - Math.round((now - dayMs(L.date)) / DAY_MS);
    findings.push({ tone: "info", text: `Body-composition changes need two scans at least 2 weeks apart.${nextIn > 0 ? ` Next useful scan in about ${nextIn} days.` : " Your next scan will unlock this."}` });
  } else {
    const smmTxt = dSmm == null ? null : `Muscle ${dSmm > 0 ? "+" : ""}${dSmm} kg`;
    const fmTxt = dFm == null ? null : `fat ${dFm > 0 ? "+" : ""}${dFm} kg`;
    const summary = [smmTxt, fmTxt].filter(Boolean).join(", ");
    if (summary) findings.push({ tone: "info", text: `${summary} over ${days} days (since ${P.date}). Judged in kg — muscle % can rise just because fat fell.` });

    const pr = proteinRange(type, L.weight, L.ffm);
    used.add(pr.source);

    const muscleDown = dSmm != null && dSmm <= -NOISE.smmKg;
    const muscleFlat = dSmm != null && dSmm < 0.25 && !muscleDown;
    const fatUp = dFm != null && dFm >= NOISE.fmKg;
    const fatFlat = dFm != null && dFm > -NOISE.fmKg && !fatUp;

    if (muscleDown) {
      findings.push({ tone: "bad", text: `Muscle dropped ${Math.abs(dSmm)} kg — beyond normal scan noise (±${NOISE.smmKg} kg).` });
      actions.push({ kind: "protein", text: `Raise protein to the top of ${pr.low}–${pr.high} g/day (${pr.basis}).` });
      actions.push({ kind: "training", text: "Keep lifting heavy with the same weekly volume — cutting training while dieting is the fastest way to lose muscle." });
      if (type === "cut" && kcalAdjust < 0) {
        // Losing muscle while weight is barely moving points at protein/training,
        // not the deficit — cutting harder now would make it worse.
        kcalAdjust = 0;
        for (let i = actions.length - 1; i >= 0; i--) if (actions[i].kind === "calories") actions.splice(i, 1);
        actions.push({ kind: "calories", text: "Hold calories where they are for now. Fix protein and training first, re-scan in 2–4 weeks, then cut further if weight is still slow." });
      } else if (type === "cut" && kcalAdjust === 0) {
        kcalAdjust = 100;
        actions.push({ kind: "calories", text: "Ease the deficit by about 100 kcal/day." });
      }
      if (type === "recomp" && kcalAdjust <= 0) { kcalAdjust = 150; actions.push({ kind: "calories", text: "Move to maintenance: about 150 kcal/day more." }); }
    }

    if ((type === "build" || type === "recomp") && muscleFlat && days >= 28) {
      findings.push({ tone: "warn", text: `Muscle hasn't moved meaningfully in ${days} days.` });
      actions.push({ kind: "protein", text: `Make sure protein reaches ${pr.low}–${pr.high} g/day (${pr.basis}) — spread over 3–6 meals.` });
      actions.push({ kind: "training", text: "Add load or reps week to week on your main lifts (progressive overload)." });
      if (type === "build" && kcalAdjust === 0) { kcalAdjust = 150; actions.push({ kind: "calories", text: "If protein is already there, add about 150 kcal/day." }); }
    }

    if (fatUp && (type === "build" || type === "recomp")) {
      findings.push({ tone: "warn", text: `Fat up ${dFm} kg — more than the muscle gained.` });
      if (kcalAdjust >= 0) { kcalAdjust = -150; actions.push({ kind: "calories", text: "Cut about 150 kcal/day to limit fat gain." }); }
    }

    if (type === "cut" && fatFlat && !muscleDown && days >= 21 && kcalAdjust === 0) {
      findings.push({ tone: "warn", text: `Fat mass barely moved in ${days} days.` });
      kcalAdjust = -150;
      actions.push({ kind: "calories", text: "Eat about 150 kcal/day less, and keep protein high." });
    }

    if (type === "recomp" && dFm != null && dFm <= -NOISE.fmKg && dSmm != null && dSmm >= 0.25) {
      findings.push({ tone: "ok", text: "Fat down and muscle up at the same time — recomposition is working. Keep everything as it is." });
    }
  }

  // Later rules refine earlier ones: keep only the final calorie instruction so
  // the advice never says "eat less" and "eat more" at the same time.
  const calIdx = actions.map((a, i) => (a.kind === "calories" ? i : -1)).filter((i) => i >= 0);
  calIdx.slice(0, -1).reverse().forEach((i) => actions.splice(i, 1));

  // Protein target always shown.
  const pr = proteinRange(type, L.weight, L.ffm);
  used.add(pr.source);
  if (!actions.some((a) => a.kind === "protein")) {
    actions.push({ kind: "protein", text: `Protein: ${pr.low}–${pr.high} g/day (${pr.basis}).` });
  }
  if (!actions.some((a) => a.kind === "calories")) {
    actions.push({ kind: "calories", text: "Calories: no change — keep doing what you're doing." });
  }
  if (actions.some((a) => a.kind === "calories" && /kcal\/day/.test(a.text))) used.add("energy7700");

  const tones = findings.map((f) => f.tone);
  const status = tones.includes("bad") ? "bad" : tones.includes("warn") ? "warn" : tones.includes("ok") ? "ok" : "info";

  return {
    status, findings, actions, kcalAdjust,
    latest: L, prev: P, days, trend, ratePct, band: { min: minPct, max: maxPct },
    protein: pr, sourcesUsed: [...used],
  };
}

// ─── AUTH / SESSION ──────────────────────────────────────────────────────────

// JWT payloads are base64url (uses - and _ , no padding). Plain atob() throws on
// those characters, which used to make the expiry check silently fail.
export function tokenExpiry(token) {
  if (!token || typeof token !== "string") return null;
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    let b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const json = typeof atob === "function"
      ? atob(b64)
      : Buffer.from(b64, "base64").toString("binary");
    const payload = JSON.parse(json);
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

// Refresh a little before the token actually dies, so a request never goes out
// with a token that expires in flight. Unknown expiry → treat as needing refresh.
export function tokenNeedsRefresh(token, now = Date.now(), marginMs = 2 * 60 * 1000) {
  const exp = tokenExpiry(token);
  if (exp == null) return true;
  return exp - now <= marginMs;
}

// A PostgREST / GoTrue response that failed because of the JWT itself
// (expired, not yet valid, malformed) rather than because of the data.
export function isJwtError(status, body) {
  const msg = `${body?.message || ""} ${body?.msg || ""} ${body?.error || ""} ${body?.error_code || ""} ${body?.code || ""}`;
  if (/PGRST30[0-9]/.test(msg)) return true;
  if (/jwt|bad_jwt|token/i.test(msg)) return true;
  return status === 401;
}

// The ONLY refresh failures that should end the session. Everything else —
// no network, a 5xx, rate limiting, a paused project — is temporary, and
// signing the user out for it is what made the app look like it had lost
// everything after a period of inactivity.
export function isFatalRefreshFailure(status, body) {
  if (status == null) return false;               // network error
  if (status >= 500 || status === 429) return false;
  const code = `${body?.error_code || ""} ${body?.error || ""} ${body?.code || ""}`;
  const msg = `${body?.error_description || ""} ${body?.msg || ""} ${body?.message || ""}`;
  if (/refresh_token_not_found|refresh_token_already_used|session_not_found|session_expired|invalid_grant|user_not_found/i.test(code)) return true;
  if (/invalid refresh token|refresh token not found|already used|session.*(expired|not found)/i.test(msg)) return true;
  return status === 400 || status === 401;
}

// ─── DATA LOADING ────────────────────────────────────────────────────────────

export const EMPTY_DATA = Object.freeze({
  weights: [], inbody: [], measurements: [], logs: [], sessions: [], goal: null,
});

// Merge a fresh load into what is already on screen. A table that failed to
// load keeps its previous rows — a failed request must never blank the screen.
export function mergeLoadedData(prev, results) {
  const base = prev || EMPTY_DATA;
  const pickRows = (r, fallback) => (Array.isArray(r) ? r : fallback);
  const goals = results?.goals;
  return {
    weights:      pickRows(results?.weights,      base.weights),
    inbody:       pickRows(results?.inbody,       base.inbody),
    measurements: pickRows(results?.measurements, base.measurements),
    logs:         pickRows(results?.logs,         base.logs),
    sessions:     pickRows(results?.sessions,     base.sessions),
    goal: Array.isArray(goals) ? (goals.length ? goals[0] : null) : base.goal,
  };
}

// Read a cached snapshot back defensively — a corrupted or old-shape cache
// should degrade to "no cache", never crash the app on launch.
export function parseCachedData(raw) {
  if (!raw || typeof raw !== "string") return null;
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return null;
    return mergeLoadedData(EMPTY_DATA, {
      weights: obj.weights, inbody: obj.inbody, measurements: obj.measurements,
      logs: obj.logs, sessions: obj.sessions,
      goals: obj.goal ? [obj.goal] : [],
    });
  } catch {
    return null;
  }
}

// ─── MUSCLE GROUPS ───────────────────────────────────────────────────────────

// Arms is split: biceps and triceps are trained on different days and with
// different movements, so one "Arms" bucket hid what was actually worked.
export const SESSION_MUSCLES = ["Chest", "Back", "Legs", "Shoulders", "Biceps", "Triceps", "Core", "Cardio"];
export const WORKOUT_MUSCLES = ["Chest", "Back", "Legs", "Shoulders", "Biceps", "Triceps", "Core"];

// Older sets were logged under "Arms". Keep that tab visible only while such
// sets exist, so history is never hidden by the rename.
export function workoutMuscleTabs(logs) {
  const legacy = (logs || []).some((l) => l && l.muscle_group === "Arms");
  return legacy ? [...WORKOUT_MUSCLES, "Arms"] : [...WORKOUT_MUSCLES];
}

// ─── SESSIONS ────────────────────────────────────────────────────────────────

export function averageDailyBurn(sessions, days = 14, now) {
  const since = (now ?? Date.now()) - days * 86400000;
  const recent = (sessions || []).filter((s) => {
    const t = new Date(s.date).getTime();
    return isFinite(t) && t >= since && coerceNumber(s.kcal) != null;
  });
  if (!recent.length) return null;
  const total = recent.reduce((a, s) => a + (coerceNumber(s.kcal) || 0), 0);
  return Math.round(total / days);
}

export function weekSummary(sessions, now) {
  const since = (now ?? Date.now()) - 7 * 86400000;
  const inWeek = (sessions || []).filter((s) => {
    const t = new Date(s.date).getTime();
    return isFinite(t) && t >= since;
  });
  const day = averageDayBurn(sessions, 7, now);
  return {
    count: inWeek.length,
    minutes: Math.round(inWeek.reduce((a, s) => a + (coerceNumber(s.duration_min) || 0), 0)),
    kcal: Math.round(inWeek.reduce((a, s) => a + (coerceNumber(s.kcal) || 0), 0)),
    dayBurnAvg: day ? day.avg : null,
  };
}

// Whole-day energy (Apple Watch active + resting) logged with sessions.
// One value per date (the latest entry wins); averaged over the days logged.
export function averageDayBurn(sessions, days = 14, now) {
  const since = (now ?? Date.now()) - days * 86400000;
  const byDate = new Map();
  (sessions || []).forEach((s) => {
    const v = coerceNumber(s?.day_kcal);
    const d = normalizeDate(s?.date);
    if (v == null || v <= 0 || !d) return;
    const t = new Date(d + "T00:00:00").getTime();
    if (!isFinite(t) || t < since) return;
    byDate.set(d, v);
  });
  if (!byDate.size) return null;
  const vals = [...byDate.values()];
  return { avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length), days: vals.length };
}
