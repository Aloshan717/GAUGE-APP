// EVOLVE — the weekly report as a document: a list of blocks that the app
// shows, the PDF draws and "copy as text" writes out. One source, so all three
// always say the same thing.
//
// Blocks: title · sub · stats (tiles) · h2 · p · table · bars · list · checkin
import { fmtDate, fmtNum, signedIso } from "./i18n.js";
import { MUSCLES, MUSCLE_NAMES } from "./exercises.js";
import { localISO } from "./body.js";

const KIND_ICON = { train: "train", food: "flame", up: "bolt", stall: "repeat", sync: "watch", good: "check" };
// Keep a number expression in one piece, left to right, inside Arabic text.
const iso = (s) => `\u2066${s}\u2069`;

export function reportDoc(r, { t, lang, name }) {
  const L = lang === "ar" ? 1 : 0;
  const pick = (v) => (Array.isArray(v) ? v[L] ?? v[0] : v);
  const n0 = (v, d = 0) => (v == null ? "—" : fmtNum(v, d));
  const hm = (min) => (!min ? "—" : min < 60 ? t("rpMin", { m: min }) : t("rpHm", { h: Math.floor(min / 60), m: min % 60 }));
  const kg = t("kg"), g = t("g");
  const arrow = lang === "ar" ? "←" : "→";
  const tr = r.training, f = r.food, pv = r.prev || {};
  // "+2 vs the week before" (green when it moved the good way)
  // short: just the difference ("+25 min"), for the comparison table
  const vs = (cur, prev, { digits = 0, unit = "", good = "up", pct = false, short = false } = {}) => {
    if (cur == null || prev == null) return null;
    const say = (d) => (short ? d : t("rpVsPrev", { d }));
    if (pct) {
      if (!prev) return null;
      const p = Math.round(((cur - prev) / prev) * 100);
      return p === 0 ? { text: short ? "=" : t("rpSame"), tone: null } : { text: say(`${signedIso(p)}%`), tone: (p > 0) === (good === "up") ? "ok" : "warn" };
    }
    const d = +(cur - prev).toFixed(digits);
    if (d === 0) return { text: short ? "=" : t("rpSame"), tone: null };
    return { text: say(`${signedIso(d, digits)}${unit}`), tone: good == null ? null : (d > 0) === (good === "up") ? "ok" : "warn" };
  };
  const w = r.weight;
  const weightDelta = w.end && w.start ? w.delta : null;

  const blocks = [];
  blocks.push({ type: "title", text: t("rpTitle") });
  blocks.push({ type: "sub", text: [`${fmtDate(r.from, lang)} – ${fmtDate(r.to, lang, "long")}`, name].filter(Boolean).join(" · ") });

  // ── At a glance ──
  blocks.push({ type: "stats", items: [
    { v: String(tr.workouts), l: t("rpWorkouts"), d: vs(tr.workouts, pv.workouts) },
    { v: hm(tr.minutes), l: t("rpTime"), d: vs(tr.minutes, pv.minutes, { unit: ` ${t("rpMinShort")}` }) },
    { v: tr.volume ? fmtNum(tr.volume) : "—", l: t("rpVolume"), d: vs(tr.volume, pv.volume, { pct: true }) },
    { v: f.days ? n0(f.kcal) : "—", l: f.target ? t("rpKcal", { t: fmtNum(f.target) }) : t("rpKcalNoT"), d: { text: t("rpLogged", { n: f.days }), tone: f.days >= 5 ? "ok" : "warn" } },
    { v: f.days ? `${n0(f.protein)} ${g}` : "—", l: f.proteinTarget ? t("rpProtein", { t: fmtNum(f.proteinTarget) }) : t("rpProteinNoT"), d: f.proteinHit != null && f.days ? { text: t("rpProteinHit", { n: f.proteinHit }), tone: f.proteinHit >= 5 ? "ok" : "warn" } : null },
    { v: r.burn ? n0(r.burn.avg) : "—", l: t("rpBurn"), d: r.burn?.body != null ? { text: t("rpBurnSplit", { b: fmtNum(r.burn.body), m: fmtNum(r.burn.moving) }), tone: null } : null },
    { v: weightDelta != null ? `${signedIso(weightDelta, 1)} ${kg}` : w.end && w.end.date >= r.from ? `${n0(w.end.weight, 1)} ${kg}` : "—", l: t("rpWeight"),
      d: w.end && w.start ? { text: `${fmtNum(w.start.weight, 1)} ${arrow} ${fmtNum(w.end.weight, 1)}`, tone: null } : null },
  ] });

  // ── Training ──
  blocks.push({ type: "h2", text: t("rpTraining"), icon: "train" });
  if (!tr.sets) blocks.push({ type: "p", text: t("rpNoTraining"), muted: true });
  else {
    blocks.push({ type: "p", text: t("rpTrainLine", { w: tr.workouts, s: tr.sets, t: hm(tr.minutes), v: fmtNum(tr.volume) }) });
    const ms = [...MUSCLES, ...Object.keys(tr.muscles).filter((m) => !MUSCLES.includes(m))].filter((m) => tr.muscles[m]);
    const max = Math.max(...ms.map((m) => tr.muscles[m]));
    blocks.push({ type: "bars", title: t("rpSetsPerMuscle"), items: ms.map((m) => ({ l: pick(MUSCLE_NAMES[m] || [m, m]), v: tr.muscles[m], max, text: t("rpSetsN", { n: tr.muscles[m] }) })) });
    blocks.push({
      type: "table", title: t("rpExercises"),
      cols: [{ h: t("rpColEx"), w: 2.5 }, { h: t("rpColSets"), w: 0.8, end: true }, { h: t("rpColBest"), w: 1.3, end: true, ltr: true }, { h: t("rpColVs"), w: 1.3, end: true }],
      rows: tr.exercises.map((x) => [
        `${x.record ? "🏆 " : ""}${pick(x.name)}`,
        String(x.sets),
        `${fmtNum(x.best.kg, 2)}×${x.best.reps}`,
        x.change == null ? { text: t("rpFirst"), tone: null }
          : x.change !== 0 ? { text: `${signedIso(x.change, 2)} ${kg}`, tone: x.change > 0 ? "ok" : "warn" }
          : x.repsChange ? { text: `${signedIso(x.repsChange)} ${t("rpReps")}`, tone: x.repsChange > 0 ? "ok" : "warn" }
          : { text: "=", tone: null },
      ]),
    });
    if (tr.records.length) blocks.push({ type: "p", text: t("rpRecords", { n: tr.records.length, list: tr.records.map((x) => `${pick(x.name)} ${iso(`${fmtNum(x.kg, 2)}×${x.reps}`)}`).join(lang === "ar" ? "، " : ", ") }) });
  }

  // ── Food and burn ──
  blocks.push({ type: "h2", text: t("rpFood"), icon: "flame" });
  if (!f.days) blocks.push({ type: "p", text: t("rpNoFood"), muted: true });
  else blocks.push({ type: "p", text: t("rpFoodLine", { n: f.days, k: n0(f.kcal), tk: f.target ? fmtNum(f.target) : "—", p: n0(f.protein), tp: f.proteinTarget ? fmtNum(f.proteinTarget) : "—" }) });
  if (r.burn) blocks.push({ type: "p", text: r.burn.body != null ? t("rpBurnLine", { a: fmtNum(r.burn.avg), b: fmtNum(r.burn.body), m: fmtNum(r.burn.moving), n: r.burn.days }) : t("rpBurnLineSimple", { a: fmtNum(r.burn.avg), n: r.burn.days }) });
  if (r.balance) blocks.push({ type: "p", text: t(r.balance.kcal < 0 ? "rpDeficit" : "rpSurplus", { d: fmtNum(Math.abs(r.balance.kcal)), k: fmtNum(Math.abs(r.balance.kgPerWeek), 2) }) });
  if (f.days || r.burn) {
    blocks.push({
      type: "table",
      cols: [{ h: t("rpColDay"), w: 1.6 }, { h: t("rpColKcal"), w: 1, end: true }, { h: t("rpColPro"), w: 1, end: true }, { h: t("rpColBurn"), w: 1, end: true }],
      rows: f.daily.map((d) => [fmtDate(d.date, lang, "day"), d.kcal ? fmtNum(d.kcal) : "—", d.protein ? `${fmtNum(d.protein)} ${g}` : "—", d.burn ? fmtNum(d.burn) : "—"]),
    });
  }

  // ── Body ──
  blocks.push({ type: "h2", text: t("rpBody"), icon: "scale" });
  if (w.end && w.start) blocks.push({ type: "p", text: t("rpWeightLine", { a: fmtNum(w.start.weight, 1), b: fmtNum(w.end.weight, 1), d: signedIso(w.delta, 1), a1: fmtDate(w.start.date, lang), b1: fmtDate(w.end.date, lang) }) });
  else if (w.end && w.end.date >= r.from) blocks.push({ type: "p", text: t("wkOneWeigh", { v: fmtNum(w.end.weight, 1), date: fmtDate(w.end.date, lang) }) });
  else blocks.push({ type: "p", text: t("wkNoWeigh"), muted: true });
  if (r.inbody) {
    const ib = r.inbody;
    blocks.push({ type: "p", text: t("rpInbody", { date: fmtDate(ib.date, lang), f: n0(ib.fat, 1), fd: ib.fatDelta != null ? ` (${signedIso(ib.fatDelta, 1)})` : "", m: n0(ib.muscle, 1), md: ib.muscleDelta != null ? ` (${signedIso(ib.muscleDelta, 1)})` : "" }) });
  }

  // ── Compared with the week before ──
  blocks.push({ type: "h2", text: t("rpCompare"), icon: "repeat" });
  const cmp = (label, cur, prev, fmt, opts) => [label, fmt(cur), fmt(prev), vs(cur, prev, { ...opts, short: true }) || { text: "—", tone: null }];
  const num = (v) => (v == null ? "—" : fmtNum(v));
  blocks.push({
    type: "table",
    cols: [{ h: "", w: 1.6 }, { h: t("rpColThis"), w: 1, end: true }, { h: t("rpColPrev"), w: 1, end: true }, { h: t("rpColChange"), w: 1.4, end: true }],
    rows: [
      cmp(t("rpRowDays"), tr.workouts, pv.workouts, num),
      cmp(t("rpRowTime"), tr.minutes || null, pv.minutes || null, hm, { unit: ` ${t("rpMinShort")}` }),
      cmp(t("rpRowSets"), tr.sets, pv.sets, num),
      cmp(t("rpRowVolume"), tr.volume || null, pv.volume || null, num, { pct: true }),
      cmp(t("rpRowKcal"), f.kcal, pv.kcal, num, { good: null }),
      cmp(t("rpRowProtein"), f.protein, pv.protein, num),
      cmp(t("rpRowBurn"), r.burn?.avg ?? null, pv.burn, num),
      cmp(t("rpRowWeight"), w.end && w.end.date >= r.from ? w.end.weight : null, pv.weight, (v) => (v == null ? "—" : fmtNum(v, 1)), { digits: 1, good: null }),
    ],
  });

  // ── For next week ──
  blocks.push({ type: "h2", text: t("rpRecs"), icon: "bolt" });
  const params = (p) => Object.fromEntries(Object.entries(p || {}).map(([k, v]) => [k, Array.isArray(v) ? pick(v) : typeof v === "number" ? fmtNum(v, k === "from" || k === "to" ? 2 : 0) : v]));
  blocks.push({ type: "list", items: r.recs.length ? r.recs.map((x) => ({ text: t(x.k, params(x.p)), kind: x.kind, icon: KIND_ICON[x.kind] || "info" })) : [{ text: t("rpAllGood"), kind: "good", icon: "check" }] });

  // ── Calorie check-in ──
  blocks.push({ type: "checkin", title: t("ciTitle"), text: checkinText(r.checkin, t) });
  blocks.push({ type: "p", text: t("rpFooter", { date: fmtDate(localISO(), lang, "long") }), muted: true, small: true });
  return blocks;
}

function checkinText(ci, t) {
  if (!ci) return "";
  if (ci.status === "adjust") return t("rpCheckin", { b: fmtNum(ci.burn), k: fmtNum(ci.suggested), c: signedIso(ci.change) });
  if (ci.status === "ok") return t("rpCheckinOk", { b: fmtNum(ci.burn), k: fmtNum(ci.current) });
  if (ci.status === "need-food") return t("ciNeedFood", { n: ci.logged, m: 5 });
  if (ci.status === "need-weight") return t("ciNeedWeight");
  if (ci.status === "early") return t("ciEarly");
  return t("ciNoGoal");
}

const cellText = (c) => (c && typeof c === "object" ? c.text : c ?? "");

// The same report as plain text (Markdown), to paste anywhere.
export function docText(blocks) {
  const out = [];
  for (const b of blocks) {
    if (b.type === "title") out.push(`# ${b.text}`);
    else if (b.type === "sub") out.push(b.text, "");
    else if (b.type === "stats") { b.items.forEach((x) => out.push(`- ${x.l}: ${x.v}${x.d?.text ? ` (${x.d.text})` : ""}`)); out.push(""); }
    else if (b.type === "h2") out.push(`## ${b.text}`);
    else if (b.type === "p") out.push(b.text, "");
    else if (b.type === "bars") { if (b.title) out.push(`${b.title}:`); b.items.forEach((x) => out.push(`- ${x.l}: ${x.text}`)); out.push(""); }
    else if (b.type === "table") {
      if (b.title) out.push(`${b.title}:`);
      out.push(`| ${b.cols.map((c) => c.h || " ").join(" | ")} |`, `|${b.cols.map(() => " --- ").join("|")}|`);
      b.rows.forEach((r) => out.push(`| ${r.map((c) => String(cellText(c)).replace(/\|/g, "/")).join(" | ")} |`));
      out.push("");
    } else if (b.type === "list") { b.items.forEach((x) => out.push(`- ${x.text}`)); out.push(""); }
    else if (b.type === "checkin" && b.text) { out.push(`## ${b.title}`, b.text, ""); }
  }
  // Plain text for other apps and AI tools: no invisible direction marks.
  return out.join("\n").replace(/[\u2066-\u2069]/g, "").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

export { cellText };
