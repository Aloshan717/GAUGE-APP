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

// ─── CALORIES ────────────────────────────────────────────────────────────────

export function calcCalories({ weight, height, age, gender, activity, burnKcal, goalDirection, targetWeight, targetDate, now }) {
  if (!weight || !height || !age) return null;

  const bmr = gender === "female"
    ? 10 * weight + 6.25 * height - 5 * age - 161
    : 10 * weight + 6.25 * height - 5 * age + 5;

  const activityMap = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, veryActive: 1.9 };
  const tdeeFormula = bmr * (activityMap[activity] || 1.55);

  const tdee = burnKcal
    ? Math.round(tdeeFormula * 0.6 + (bmr * 1.2 + burnKcal) * 0.4)
    : Math.round(tdeeFormula);

  let adjustment = 0;
  if (goalDirection === "lose") {
    if (targetWeight && targetDate) {
      const daysLeft = Math.max(1, Math.ceil((new Date(targetDate).getTime() - (now ?? Date.now())) / 86400000));
      const kgToLose = Math.max(0, weight - targetWeight);
      adjustment = -Math.min(750, Math.round((kgToLose * 7700) / daysLeft));
    } else {
      adjustment = -500;
    }
  } else if (goalDirection === "gain") {
    adjustment = 300;
  } else if (goalDirection === "recomp") {
    adjustment = -250;
  }

  const target = tdee + adjustment;
  const protein = Math.round(weight * (goalDirection === "recomp" ? 2.2 : 2.0));
  const fat = Math.round(weight * 0.9);
  const carbs = Math.max(0, Math.round((target - protein * 4 - fat * 9) / 4));

  return { tdee, target, adjustment, protein, fat, carbs, bmr: Math.round(bmr) };
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
  return {
    count: inWeek.length,
    minutes: Math.round(inWeek.reduce((a, s) => a + (coerceNumber(s.duration_min) || 0), 0)),
    kcal: Math.round(inWeek.reduce((a, s) => a + (coerceNumber(s.kcal) || 0), 0)),
  };
}
