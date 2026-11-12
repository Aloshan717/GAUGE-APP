// EVOLVE — body, nutrition and goal logic.
// Every number shown on Home and Goal comes from here.
//
// Evidence used:
// - Fat loss 0.5–1.0 % of body weight a week keeps muscle (Helms, Aragon & Fitschen 2014).
// - Lean gain ~0.25–0.5 %/wk surplus for trained lifters (Iraki et al. 2019).
// - Muscle gain potential by training age (Aragon model): ~1–1.5 % bw/month new,
//   0.5–1 % intermediate, 0.25–0.5 % advanced; roughly half for women in absolute kg,
//   and about half again while in a calorie deficit.
// - Protein 2.3–3.1 g/kg fat-free mass in a deficit (Helms 2014); 1.6–2.2 g/kg otherwise (Morton 2018).
// - Resting energy: Katch–McArdle (370 + 21.6 × FFM) with an InBody, else Mifflin–St Jeor.
// - Wrist trackers misjudge energy by ~25–30 % (meta-analyses), so the watch is
//   blended with the formula and both are corrected from your real weight trend.
import { coerceNumber, normalizeDate, mergeWeightSeries, withMuscleKg, weightTrend, goalMuscleKg } from "./core.js";

const DAY = 86400000;
const KCAL_PER_KG = 7700;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const round = (n, step) => Math.round(n / step) * step;
const t0 = (d) => new Date(d + "T00:00:00Z").getTime();
export const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);

// Local calendar date (the phone's), not UTC — a log at 1 am belongs to that day.
export function localISO(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export const addDays = (iso, n) => isoDay(t0(iso) + n * DAY);

// ─── Current body ────────────────────────────────────────────────────────────

// Latest weight (weigh-ins and scans merged), latest scan and its fat-free mass.
export function currentBody({ weights, scans }) {
  const series = mergeWeightSeries(weights, scans);
  const latestW = series[series.length - 1] || null;
  const sorted = withMuscleKg(scans).filter((s) => normalizeDate(s?.date)).sort((a, b) => (a.date < b.date ? -1 : 1));
  const scan = sorted[sorted.length - 1] || null;
  const sw = coerceNumber(scan?.weight), bf = coerceNumber(scan?.body_fat);
  const ffmScan = sw != null && bf != null ? sw * (1 - bf / 100) : null;
  // FFM moves slowly; use the scan's FFM, but only if the scan is under ~4 months old.
  const fresh = scan && (Date.now() - t0(scan.date)) < 120 * DAY;
  return {
    series,
    weight: latestW ? latestW.weight : sw,
    weightDate: latestW?.date || scan?.date || null,
    scan,
    bodyFat: bf,
    muscleKg: coerceNumber(scan?.muscle_kg),
    muscleKind: scan?.muscle_kind || null,
    ffm: fresh && ffmScan ? +ffmScan.toFixed(1) : null,
    ffmAny: ffmScan ? +ffmScan.toFixed(1) : null,
  };
}

// ─── Energy ──────────────────────────────────────────────────────────────────

export const ageFrom = (birthYear, now = new Date()) => (birthYear ? new Date(now).getFullYear() - birthYear : null);

export function restingEnergy({ ffm, weight, heightCm, age, sex }) {
  if (ffm) return { kcal: Math.round(370 + 21.6 * ffm), method: "katch" };
  if (weight && heightCm && age && sex) {
    const base = 10 * weight + 6.25 * heightCm - 5 * age;
    return { kcal: Math.round(sex === "f" ? base - 161 : base + 5), method: "mifflin" };
  }
  return null;
}

const ACTIVITY = { sit: 1.3, feet: 1.45, job: 1.65 };
export function formulaMaintenance({ bmr, activity, trainDays }) {
  if (!bmr) return null;
  const factor = (ACTIVITY[activity] || 1.35) + 0.04 * clamp(trainDays || 3, 0, 6);
  return Math.round(bmr * factor);
}

// Whole-day burn per date: Evolve days (watch or typed) first, then Gauge sessions.
export function burnByDate(days, sessions) {
  const m = new Map();
  (sessions || []).forEach((s) => { const v = coerceNumber(s?.day_kcal), d = normalizeDate(s?.date); if (d && v > 0) m.set(d, v); });
  (days || []).forEach((r) => { const v = coerceNumber(r?.burn_kcal), d = normalizeDate(r?.date); if (d && v > 0) m.set(d, v); });
  return m;
}

export function watchAverage(days, sessions, now = Date.now(), window = 14) {
  const since = now - window * DAY;
  const vals = [...burnByDate(days, sessions).entries()].filter(([d]) => t0(d) >= since && t0(d) <= now).map(([, v]) => v);
  if (vals.length < 4) return null;
  return { avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length), days: vals.length };
}

// What you really burn, from what you ate and how your weight moved:
// maintenance = average intake − (weight change × 7,700 kcal/kg).
export function adaptiveMaintenance({ days, weights, scans, now = Date.now(), window = 21 }) {
  const since = now - window * DAY;
  const eaten = (days || []).filter((r) => normalizeDate(r?.date) && t0(r.date) >= since && t0(r.date) <= now && coerceNumber(r.kcal_in) >= 600);
  if (eaten.length < 10) return null;
  const trend = weightTrend(mergeWeightSeries(weights, scans), now, window);
  if (!trend) return null;
  const avgIn = eaten.reduce((a, r) => a + coerceNumber(r.kcal_in), 0) / eaten.length;
  return { kcal: Math.round(avgIn - (trend.kgPerWeek / 7) * KCAL_PER_KG), days: eaten.length, kgPerWeek: trend.kgPerWeek, avgIn: Math.round(avgIn) };
}

export function maintenance({ profile = {}, body, days, sessions, weights, scans, now = Date.now() }) {
  const age = ageFrom(profile.birth_year, now);
  const bmr = restingEnergy({ ffm: body?.ffm, weight: body?.weight, heightCm: coerceNumber(profile.height_cm), age, sex: profile.sex });
  const formula = bmr ? formulaMaintenance({ bmr: bmr.kcal, activity: profile.activity, trainDays: profile.train_days?.length }) : null;
  const watch = watchAverage(days, sessions, now);
  const adaptive = adaptiveMaintenance({ days, weights, scans, now });

  let prior = formula && watch ? Math.round((formula + watch.avg) / 2) : formula || watch?.avg || null;
  if (!prior && !adaptive) return { kcal: null, bmr, formula, watch, adaptive, missing: !bmr ? "profile" : null };
  let kcal = prior;
  if (adaptive) {
    const w = prior ? clamp(adaptive.days / 21, 0.3, 0.7) : 1;
    kcal = Math.round((prior || adaptive.kcal) * (1 - w) + adaptive.kcal * w);
  }
  return { kcal, bmr, formula, watch, adaptive };
}

// ─── Goal direction and daily targets ───────────────────────────────────────

// lose | gain | recomp | maintain — from the goal's targets vs where you are now.
export function goalDirection(goal, body) {
  if (!goal) return "maintain";
  const w = body?.weight;
  const tw = coerceNumber(goal.target_weight);
  const tbf = coerceNumber(goal.target_body_fat);
  const tm = goalMuscleKg(goal, w);
  const fatDown = tbf != null && body?.bodyFat != null && tbf < body.bodyFat - 0.5;
  const muscleUp = tm != null && body?.muscleKg != null && tm > body.muscleKg + 0.5;
  if (tw != null && w != null) {
    if (tw < w - 0.5) return "lose";
    if (tw > w + 0.5) return "gain";
    return fatDown || muscleUp ? "recomp" : "maintain";
  }
  if (fatDown) return muscleUp ? "recomp" : "lose";
  if (muscleUp) return "gain";
  return "maintain";
}

const weeksTo = (date, now) => (date ? (t0(date) - now) / (7 * DAY) : null);

export function dailyTargets({ goal, body, maint, profile = {}, now = Date.now() }) {
  const w = body?.weight;
  if (!w) return null;
  const dir = goalDirection(goal, body);
  const m = maint?.kcal;
  let ratePct = 0, adjust = 0;

  if (dir === "lose") {
    // The deficit the goal actually needs: enough for the weight target AND the
    // fat target by the date — never more than 1 %/wk (muscle), never below 0.25 %/wk.
    const tw = coerceNumber(goal?.target_weight);
    const tbf = coerceNumber(goal?.target_body_fat);
    const weeks = weeksTo(goal?.target_date, now);
    ratePct = 0.75;
    if (weeks > 0) {
      const weightRate = tw != null ? Math.max(0, (w - tw) / weeks) : 0;
      let fatRate = 0;
      if (tbf != null && body?.bodyFat != null) {
        const ffm = body.ffmAny ?? w * (1 - body.bodyFat / 100);
        const targetW = tw ?? ffm / (1 - tbf / 100);
        fatRate = Math.max(0, (w * body.bodyFat / 100 - targetW * tbf / 100) / weeks);
      }
      const need = Math.max(weightRate, fatRate);
      if (need > 0) ratePct = clamp((need / w) * 100, 0.25, 1.0);
    }
    adjust = -round((w * ratePct / 100) * KCAL_PER_KG / 7, 10);
  } else if (dir === "gain") {
    ratePct = { new: 0.5, mid: 0.35, adv: 0.25 }[profile.experience || "mid"];
    adjust = round((w * ratePct / 100) * KCAL_PER_KG / 7, 10);
  } else if (dir === "recomp") {
    adjust = m ? -clamp(round(m * 0.11, 10), 200, 350) : -300;
  }

  let kcal = m ? round(m + adjust, 10) : null;
  let floorHit = false;
  if (kcal != null) {
    const floor = kcalFloor(maint?.bmr?.kcal, profile.sex);
    if (kcal < floor) { kcal = floor; floorHit = true; }
  }

  const ffm = body?.ffm;
  let protein, range, basis;
  if ((dir === "lose" || dir === "recomp") && ffm) {
    protein = round(ffm * 2.6, 5); range = [Math.round(ffm * 2.3), Math.round(ffm * 3.1)]; basis = "ffm";
  } else if (dir === "lose" || dir === "recomp") {
    protein = round(w * 2.0, 5); range = [Math.round(w * 1.6), Math.round(w * 2.2)]; basis = "bw";
  } else {
    protein = round(w * 1.8, 5); range = [Math.round(w * 1.6), Math.round(w * 2.2)]; basis = "bw";
  }
  return { direction: dir, kcal, maintenance: m, adjust: kcal != null && m ? kcal - m : adjust, goalAdjust: adjust, ratePct, protein, proteinRange: range, proteinBasis: basis, floorHit };
}

// The least to eat in a day: a little above your resting energy.
export const kcalFloor = (bmr, sex) => round(Math.max(Math.round((bmr || 0) * 1.1), sex === "f" ? 1200 : 1500), 10);

// What your goal takes off a day's burn (a deficit, −) or adds to it (a
// surplus, +): what the goal needs, moved by the check-ins you applied.
export const liveAdjust = (targets) => (targets?.goalAdjust ?? 0) + (targets?.lock?.shift || 0);

// What to eat on a day. On a day with a burn (your body at rest + your movement,
// from the watch or typed in) it's that burn with your goal's adjustment, so it
// grows as you move — never below the safe minimum. On a day without a burn
// it's your planned target.
export function dayTarget({ targets, burn, bmr, sex }) {
  const plan = targets?.kcal || null;
  if (!plan || !(burn > 0)) return { kcal: plan, live: false };
  const adjust = liveAdjust(targets);
  const floor = kcalFloor(bmr, sex);
  const want = Math.round(burn + adjust);
  return { kcal: Math.max(want, floor), live: true, burn: Math.round(burn), adjust, floor: want < floor ? floor : null };
}

// ─── Is the goal realistic? ──────────────────────────────────────────────────

// Muscle Mass gain, kg per month, men eating at or above maintenance.
export const MUSCLE_RATE = { new: 0.9, mid: 0.45, adv: 0.2 };
export function typicalMuscleRate({ experience = "mid", sex = "m", losing = false }) {
  return +(MUSCLE_RATE[experience] * (sex === "f" ? 0.5 : 1) * (losing ? 0.5 : 1)).toFixed(2);
}

const grade = (ratio, okMax, warnMax) => (ratio <= okMax ? "ok" : ratio <= warnMax ? "warn" : "bad");

export function feasibility({ goal, body, profile = {}, now = Date.now() }) {
  const w = body?.weight;
  if (!goal || !w) return null;
  const weeks = Math.max(1, weeksTo(goal.target_date, now) ?? 0);
  const hasDate = !!goal.target_date && weeksTo(goal.target_date, now) > 0;
  const tw = coerceNumber(goal.target_weight);
  const tbf = coerceNumber(goal.target_body_fat);
  const tm = goalMuscleKg(goal, w);
  const losing = goalDirection(goal, body) === "lose" || goalDirection(goal, body) === "recomp";
  const out = { weeks: hasDate ? +weeks.toFixed(1) : null };

  if (tw != null) {
    const diff = tw - w;
    if (Math.abs(diff) < 0.3) out.weight = { kind: "done", diff: +diff.toFixed(1) };
    else {
      const pct = (Math.abs(diff) / weeks / w) * 100;
      const kind = !hasDate ? null : diff < 0 ? grade(pct, 1.0, 1.25) : grade(pct, 0.5, 0.75);
      out.weight = { kind, diff: +diff.toFixed(1), pctPerWeek: +pct.toFixed(2), weeksNeeded: Math.ceil(Math.abs(diff) / (w * (diff < 0 ? 0.0075 : 0.004))) };
    }
  }

  if (tbf != null && body.bodyFat != null) {
    const ffm = body.ffmAny ?? w * (1 - body.bodyFat / 100);
    const fm = w * body.bodyFat / 100;
    const targetW = tw ?? ffm / (1 - tbf / 100);
    const tfm = targetW * tbf / 100;
    const loss = fm - tfm;
    if (loss <= 0.2) out.bodyFat = { kind: "done", fatKg: +(-loss).toFixed(1) };
    else {
      const kgWeek = loss / weeks;
      const pct = (kgWeek / w) * 100;
      out.bodyFat = {
        kind: hasDate ? grade(pct, 0.75, 1.0) : null,
        fatKg: +loss.toFixed(1),
        deficit: hasDate ? Math.round((loss * KCAL_PER_KG) / (weeks * 7) / 10) * 10 : null,
        weeksNeeded: Math.ceil(loss / (w * 0.006)),
      };
    }
  }

  if (tm != null && body.muscleKg != null) {
    const gain = tm - body.muscleKg;
    const typical = typicalMuscleRate({ experience: profile.experience, sex: profile.sex, losing });
    if (gain <= 0.2) out.muscle = { kind: "done", gainKg: +gain.toFixed(1), typical };
    else {
      const monthly = gain / (weeks / 4.345);
      out.muscle = {
        kind: hasDate ? grade(monthly / typical, 1, 2) : null,
        gainKg: +gain.toFixed(1), perMonth: +monthly.toFixed(2), typical,
        weeksNeeded: Math.ceil((gain / typical) * 4.345),
      };
    }
  }

  // Earliest realistic date that reaches every target.
  const needs = ["weight", "bodyFat", "muscle"].map((k) => out[k]?.weeksNeeded).filter((n) => n > 0);
  const nowIso = isoDay(now);
  out.earliest = needs.length ? addDays(nowIso, Math.max(...needs) * 7) : nowIso;
  out.byTarget = {
    weight: out.weight?.weeksNeeded ? addDays(nowIso, out.weight.weeksNeeded * 7) : null,
    bodyFat: out.bodyFat?.weeksNeeded ? addDays(nowIso, out.bodyFat.weeksNeeded * 7) : null,
    muscle: out.muscle?.weeksNeeded ? addDays(nowIso, out.muscle.weeksNeeded * 7) : null,
  };
  out.worst = ["bad", "warn", "ok"].find((k) => ["weight", "bodyFat", "muscle"].some((m) => out[m]?.kind === k)) || "ok";
  return out;
}

// Do the three targets describe one body? At the target weight and fat %,
// your fat-free mass carries about as much Muscle Mass as it does today.
export function consistency({ goal, body }) {
  const tw = coerceNumber(goal?.target_weight), tbf = coerceNumber(goal?.target_body_fat);
  const tm = goalMuscleKg(goal, body?.weight);
  const s = body?.scan;
  const sw = coerceNumber(s?.weight), sbf = coerceNumber(s?.body_fat), sm = coerceNumber(s?.muscle_kg);
  if (tw == null || tbf == null || tm == null || sw == null || sbf == null || sm == null) return null;
  const ratio = sm / (sw * (1 - sbf / 100));
  const ffmT = tw * (1 - tbf / 100);
  const expected = +(ratio * ffmT).toFixed(1);
  const diff = +(tm - expected).toFixed(1);
  return {
    ok: Math.abs(diff) <= 1.0,
    ffm: +ffmT.toFixed(1), expected, diff,
    altWeight: +(tm / ratio / (1 - tbf / 100)).toFixed(1),
    altFat: +((1 - tm / ratio / tw) * 100).toFixed(1),
    altMuscle: expected,
  };
}

// ─── Trends and arrival dates ────────────────────────────────────────────────

// Change per week between the reading nearest `fromDate` and the latest one.
function slopePerWeek(points, field, fromDate) {
  const pts = points.filter((p) => coerceNumber(p[field]) != null);
  if (pts.length < 2) return null;
  const last = pts[pts.length - 1];
  const first = fromDate ? (pts.find((p) => p.date >= fromDate) || pts[0]) : pts[0];
  const days = (t0(last.date) - t0(first.date)) / DAY;
  if (days < 14 || first === last) return null;
  return ((coerceNumber(last[field]) - coerceNumber(first[field])) / days) * 7;
}

// When will each metric reach its target at the current pace?
export function arrival(track, now = Date.now()) {
  if (!track || track.curr == null || track.target == null) return null;
  const remaining = track.target - track.curr;
  if (remaining * (track.direction || 1) <= 0) return { reached: true };
  const perWeek = track.key === "weight"
    ? weightTrend(track.points, now, 35)?.kgPerWeek ?? null
    : slopePerWeek(track.points, track.field, addDays(isoDay(now), -120));
  if (perWeek == null || perWeek * Math.sign(remaining) <= 0) return { reached: false, date: null, perWeek };
  const weeks = remaining / perWeek;
  if (weeks > 260) return { reached: false, date: null, perWeek };
  return { reached: false, date: addDays(isoDay(now), Math.ceil(weeks * 7)), perWeek: +perWeek.toFixed(2) };
}

// Change over the last N days ("−1.3 kg in 30 days").
export function changeOver(points, field, days = 30, now = Date.now()) {
  const pts = (points || []).filter((p) => coerceNumber(p[field]) != null);
  if (pts.length < 2) return null;
  const last = pts[pts.length - 1];
  const since = now - days * DAY;
  const base = pts.find((p) => t0(p.date) >= since && p !== last) || null;
  if (!base) return null;
  return { delta: +(coerceNumber(last[field]) - coerceNumber(base[field])).toFixed(1), days: Math.round((t0(last.date) - t0(base.date)) / DAY) };
}

// ─── Daily fuel ──────────────────────────────────────────────────────────────

export const dayRow = (days, date) => (days || []).find((r) => normalizeDate(r?.date) === date) || null;

export function proteinAverage(days, now = Date.now(), window = 7) {
  const since = now - window * DAY;
  const vals = (days || []).filter((r) => normalizeDate(r?.date) && t0(r.date) >= since && coerceNumber(r.protein_g) > 0).map((r) => coerceNumber(r.protein_g));
  return vals.length >= 3 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
}

// ─── Coach ───────────────────────────────────────────────────────────────────
// Short, specific advice. Returns [{ key, params }]; the UI writes the sentence.
export function coachTips({ goal, body, targets, tracks, days, weights, scans, now = Date.now() }) {
  const tips = [];
  if (!goal || !body?.weight) return tips;
  const dir = targets?.direction;
  const trend = weightTrend(mergeWeightSeries(weights, scans), now, 21);
  const step = (gapKgWeek) => clamp(round((Math.abs(gapKgWeek) * KCAL_PER_KG) / 7, 50), 100, 300);

  if (trend && dir === "lose") {
    const planned = -(body.weight * (targets.ratePct || 0.75)) / 100;
    if (trend.kgPerWeek > planned + 0.15) tips.push({ key: "slower", params: { kcal: step(trend.kgPerWeek - planned), rate: Math.abs(trend.kgPerWeek) } });
    else if (trend.kgPerWeek < -(body.weight * 1.1) / 100) tips.push({ key: "faster", params: { kcal: step(trend.kgPerWeek - planned) } });
  }
  if (trend && dir === "gain") {
    const planned = (body.weight * (targets.ratePct || 0.35)) / 100;
    if (trend.kgPerWeek < planned - 0.1) tips.push({ key: "gainSlow", params: { kcal: step(planned - trend.kgPerWeek) } });
    else if (trend.kgPerWeek > planned * 2 + 0.1) tips.push({ key: "gainFast", params: { kcal: step(trend.kgPerWeek - planned) } });
  }

  const mt = tracks?.muscle;
  if (mt?.points?.length >= 2) {
    const last = mt.points[mt.points.length - 1];
    const prev = [...mt.points].reverse().find((p) => t0(last.date) - t0(p.date) >= 14 * DAY);
    if (prev && coerceNumber(last.muscle_kg) - coerceNumber(prev.muscle_kg) <= -0.5) {
      tips.push({ key: "muscleDown", params: { kg: +(coerceNumber(prev.muscle_kg) - coerceNumber(last.muscle_kg)).toFixed(1), protein: targets?.protein } });
    }
  }

  const avgP = proteinAverage(days, now);
  if (avgP != null && targets?.protein && avgP < targets.protein * 0.9) tips.push({ key: "protein", params: { avg: avgP, target: targets.protein } });

  const recentLog = (days || []).some((r) => normalizeDate(r?.date) && now - t0(r.date) <= 3 * DAY && coerceNumber(r.kcal_in) > 0);
  if (!recentLog) tips.push({ key: "logFood", params: {} });

  const lastScan = body.scan?.date;
  if (!lastScan || now - t0(lastScan) > 28 * DAY) tips.push({ key: "rescan", params: { days: lastScan ? Math.floor((now - t0(lastScan)) / DAY) : null } });

  if (!tips.length) tips.push({ key: "onTrack", params: {} });
  return tips.slice(0, 3);
}
