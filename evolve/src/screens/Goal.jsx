// Goal: targets, is it realistic, give-me-the-date, daily calories/protein, coach, plan.
import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../ctx.js";
import { Icon, Seg, Field, Note } from "../ui.jsx";
import { fmtDate, fmtNum, burnLine } from "../lib/i18n.js";
import { sb, store } from "../lib/api.js";
import { coerceNumber, goalMuscleKg, musclePercent } from "../lib/core.js";
import { feasibility, consistency, goalDirection, localISO } from "../lib/body.js";
import { weeklySets } from "../lib/plan.js";
import { reportWeek } from "../lib/weekly.js";

const TAG = { ok: "tagOk", warn: "tagWarn", bad: "tagBad", done: "tagDone" };
const num = (s) => { const n = coerceNumber(s); return n == null ? null : n; };

export default function Goal() {
  const { t, lang, data, derived, user, refresh, toast, setTab, openSheet, setKcalLock } = useApp();
  const { body, targets, maint, tips } = derived;
  const today = derived.targetOn(localISO());   // today's target: your burn so far with your goal's deficit
  const goal = data.goal;
  const profile = data.profile || {};

  const fromGoal = () => ({
    w: goal?.target_weight != null ? String(goal.target_weight) : "",
    f: goal?.target_body_fat != null ? String(goal.target_body_fat) : "",
    m: goalMuscleKg(goal, body.weight) != null ? String(goalMuscleKg(goal, body.weight)) : "",
    d: goal?.target_date || "",
  });
  const [draft, setDraft] = useState(fromGoal);
  const [mode, setMode] = useState("date");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [planChoice, setPlanChoice] = useState(() => store.get("evolve_plan_choice"));
  useEffect(() => { setDraft(fromGoal()); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [goal?.id]);

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const draftGoal = useMemo(() => ({
    target_weight: num(draft.w), target_body_fat: num(draft.f), target_muscle_kg: num(draft.m),
    target_date: mode === "date" ? draft.d || null : null, start_date: goal?.start_date,
  }), [draft, mode, goal?.start_date]);
  const feas = feasibility({ goal: { ...draftGoal, target_date: draftGoal.target_date || "2999-01-01" }, body, profile });
  const feasDated = draftGoal.target_date ? feasibility({ goal: draftGoal, body, profile }) : null;
  const fit = consistency({ goal: draftGoal, body });
  const hasTarget = draftGoal.target_weight != null || draftGoal.target_body_fat != null || draftGoal.target_muscle_kg != null;
  const earliest = feas?.earliest;

  const save = async () => {
    setErr("");
    if (!hasTarget) { setErr(t("goalNeedOne")); return; }
    const date = mode === "auto" ? earliest : draft.d;
    if (!date || date <= localISO()) { setErr(t("goalNeedDate")); return; }
    setSaving(true);
    const dir = goalDirection({ ...draftGoal, target_date: date }, body);
    const keepStart = goal?.start_date && goal?.target_date && goal.target_date >= localISO();
    const tw = draftGoal.target_weight, tm = draftGoal.target_muscle_kg;
    const { error } = await sb.insert("goals", {
      user_id: user.id,
      goal_type: dir === "lose" ? "cut" : dir === "gain" ? "build" : "recomp",
      start_date: keepStart ? goal.start_date : localISO(),
      target_date: date,
      target_weight: tw,
      target_body_fat: draftGoal.target_body_fat,
      target_muscle_kg: tm,
      target_muscle: tm != null ? musclePercent(tm, "kg", tw || body.weight) : null,
    }, { optional: ["target_muscle_kg", "start_date", "goal_type"] });
    setSaving(false);
    if (error) return;
    setMode("date");
    await refresh();
    toast(t("goalSaved"));
  };

  const verdictText = (k, v) => {
    if (!v) return null;
    if (v.kind === "done") return t("vDone");
    if (!v.kind) return t("vNoDate");
    const w = fmtNum(feasDated?.weeks, 0);
    if (k === "weight") return t(v.diff < 0 ? "vLose" : "vGain", { d: fmtNum(Math.abs(v.diff), 1), w, p: fmtNum(v.pctPerWeek, 2) });
    if (k === "bodyFat") return t("vFat", { kg: fmtNum(v.fatKg, 1), w, kcal: fmtNum(v.deficit) });
    return t("vMuscle", { kg: fmtNum(v.gainKg, 1), w, pm: fmtNum(v.perMonth, 2), t: fmtNum(v.typical, 2) });
  };
  const LABELS = { weight: "mWeight", bodyFat: "mFat", muscle: "mMuscle" };
  const COLORS = { weight: "var(--accent)", bodyFat: "var(--fat)", muscle: "var(--muscle)" };

  // Daily plan
  const srcs = [];
  if (body.ffm) srcs.push(t("srcInbody"));
  else if (maint?.formula) srcs.push(t("srcFormula"));
  if (maint?.watch) srcs.push(t("srcWatch"));
  if (maint?.adaptive) srcs.push(t("srcAdaptive"));
  const ws = data.plan ? weeklySets(data.plan) : null;

  return (
    <>
      <div className="screen-head"><div className="sub">{t("goalSub")}</div><h1>{t("goalTitle")}</h1></div>
      <Seg options={[["date", t("modeDate")], ["auto", t("modeAuto")]]} value={mode} onChange={setMode} label={t("goalTitle")} />

      <div className="card">
        <div className="card-title">{t("yourTargets")}</div>
        <div className="grid2">
          <Field label={t("tWeight")} hint={body.weight != null ? t("nowV", { v: fmtNum(body.weight, 1) }) : null}>
            <input className="input" inputMode="decimal" value={draft.w} onChange={set("w")} placeholder="84" />
          </Field>
          <Field label={t("tFat")} hint={body.bodyFat != null ? t("nowV", { v: `${fmtNum(body.bodyFat, 1)}%` }) : null}>
            <input className="input" inputMode="decimal" value={draft.f} onChange={set("f")} placeholder="18.5" />
          </Field>
          <Field label={t("tMuscle")} hint={body.muscleKg != null ? t("nowV", { v: fmtNum(body.muscleKg, 1) }) : null}>
            <input className="input" inputMode="decimal" value={draft.m} onChange={set("m")} placeholder="65" />
          </Field>
          {mode === "date" && (
            <Field label={t("tDate")}>
              <input className="input" type="date" value={draft.d} min={localISO()} onChange={set("d")} />
            </Field>
          )}
        </div>
        {fit && (fit.ok ? (
          <Note><strong>{t("fitTitle")}</strong> {t("fitText", { w: fmtNum(draftGoal.target_weight, 1), f: fmtNum(draftGoal.target_body_fat, 1), ffm: fmtNum(fit.ffm, 1), m: fmtNum(fit.expected, 1), tm: fmtNum(draftGoal.target_muscle_kg, 1) })}</Note>
        ) : (
          <div className="note warn" style={{ flexDirection: "column" }}>
            <span><strong>{t("misfitTitle")}</strong> {t("misfitText", { w: fmtNum(draftGoal.target_weight, 1), f: fmtNum(draftGoal.target_body_fat, 1), m: fmtNum(fit.expected, 1), tm: fmtNum(draftGoal.target_muscle_kg, 1) })}</span>
            <div className="chips">
              <button className="chip sm" onClick={() => setDraft((d) => ({ ...d, w: String(fit.altWeight) }))}>{t("useV", { v: `${fmtNum(fit.altWeight, 1)} ${t("kg")}` })}</button>
              {fit.altFat > 3 && fit.altFat < 45 && <button className="chip sm" onClick={() => setDraft((d) => ({ ...d, f: String(fit.altFat) }))}>{t("useV", { v: `${fmtNum(fit.altFat, 1)}%` })}</button>}
              <button className="chip sm" onClick={() => setDraft((d) => ({ ...d, m: String(fit.altMuscle) }))}>{t("useV", { v: `${fmtNum(fit.altMuscle, 1)} ${t("kg")}` })}</button>
            </div>
          </div>
        ))}
      </div>

      {mode === "date" && hasTarget && feasDated && (
        <div className="card">
          <div className="card-title">{t("realistic")}</div>
          {["weight", "bodyFat", "muscle"].filter((k) => feasDated[k]).map((k) => (
            <div key={k} className="col" style={{ gap: 4, paddingBottom: 10, borderBottom: "1px solid var(--line)" }}>
              <div className="row between">
                <span className="strong">{t(LABELS[k])}</span>
                {feasDated[k].kind && <span className={`tag ${feasDated[k].kind === "done" ? "ok" : feasDated[k].kind}`}>{t(TAG[feasDated[k].kind])}</span>}
              </div>
              <span className="small sub">{verdictText(k, feasDated[k])}</span>
            </div>
          ))}
          {feasDated.worst !== "ok" && earliest && (
            <>
              <div className="body">{t("suggestDate", { date: fmtDate(earliest, lang, "long") })}</div>
              <button className="btn soft" onClick={() => setDraft((d) => ({ ...d, d: earliest }))}>{t("useDate", { date: fmtDate(earliest, lang) })}</button>
            </>
          )}
        </div>
      )}

      {mode === "auto" && hasTarget && feas && (
        <div className="card">
          <div className="small strong sub">{t("earliest")}</div>
          <div className="num" style={{ fontSize: 42, color: "var(--accent-text)", lineHeight: 1 }}>{fmtDate(earliest, lang, "long")}</div>
          {["weight", "bodyFat", "muscle"].filter((k) => feas.byTarget[k]).map((k) => (
            <div key={k} className="row between small" style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              <span className="row strong" style={{ gap: 7 }}><span className="dot" style={{ background: COLORS[k] }} />{t(LABELS[k])}</span>
              <span className="sub">{fmtDate(feas.byTarget[k], lang)}</span>
            </div>
          ))}
          <div className="small muted">{t("earliestNote")}</div>
        </div>
      )}

      {err && <div className="err" role="alert">{err}</div>}
      <button className="btn primary lg" onClick={save} disabled={saving}>{saving ? t("saving") : mode === "auto" && earliest ? `${t("saveGoal")} · ${fmtDate(earliest, lang)}` : t("saveGoal")}</button>

      {/* Training plan */}
      {data.plan ? (
        <div className="card accent">
          <div className="row strong" style={{ color: "var(--accent-text)", fontSize: 15 }}><Icon name="check" size={18} stroke={2.4} />{t("planActiveTitle")}</div>
          <div className="body sub">{t("planSummary", { split: data.plan.splitName?.[lang === "ar" ? 1 : 0], n: data.plan.days.length, m: data.plan.minutes })}{ws ? ` · ${ws.min}–${ws.max} ${t("stSets")}` : ""}</div>
          <button className="btn" onClick={() => setTab("planner")}>{t("planEdit")}</button>
        </div>
      ) : planChoice === "no" ? (
        <div className="card">
          <div className="body sub">{t("planNoText")}</div>
          <button className="btn soft" onClick={() => { store.del("evolve_plan_choice"); setPlanChoice(null); setTab("planner"); }}>{t("planInstead")}</button>
        </div>
      ) : (
        <div className="card accent">
          <div className="row card-title" style={{ gap: 8 }}><Icon name="train" color="var(--accent)" />{t("planQ")}</div>
          <div className="small sub">{t("planQSub")}</div>
          <button className="btn primary" onClick={() => setTab("planner")}>{t("planYes")}</button>
          <button className="btn ghost" onClick={() => { store.set("evolve_plan_choice", "no"); setPlanChoice("no"); }}>{t("planNo")}</button>
        </div>
      )}

      {/* Daily plan */}
      {goal && targets && (
        <div className="card">
          <div className="card-title">{t("planDaily")}</div>
          {targets.kcal ? (
            <>
              <div className="grid2">
                <div className="box" style={{ borderTop: "2px solid var(--accent)" }}>
                  <div className="label">{t("calories")}</div>
                  <div><span className="num" style={{ fontSize: 30 }}>{fmtNum(targets.kcal)}</span> <span className="small muted">{t("kcal")}</span></div>
                  {targets.lock
                    ? <div className="small sub">{t("lockNote", { date: fmtDate(targets.lock.since, lang) })}</div>
                    : <div className="small sub">{t("calMath", { m: fmtNum(targets.maintenance), s: targets.adjust < 0 ? "−" : "+", d: fmtNum(Math.abs(targets.adjust)) })}</div>}
                </div>
                <div className="box" style={{ borderTop: "2px solid var(--muscle)" }}>
                  <div className="label">{t("protein")}</div>
                  <div><span className="num" style={{ fontSize: 30 }}>{fmtNum(targets.protein)}</span> <span className="small muted">{t("g")}</span></div>
                  <div className="small sub">{t(targets.proteinBasis === "ffm" ? "basisFfm" : "basisBw")}</div>
                </div>
              </div>
              {today.live && <div className="small sub">{t("todayIs", { k: fmtNum(today.kcal), why: burnLine(today, t) })}</div>}
              {targets.floorHit && <Note kind="warn" icon="info">{t("floorNote")}</Note>}
              {targets.lock && targets.autoKcal && Math.abs(targets.autoKcal - targets.kcal) >= 50 && (
                <div className="row between small">
                  <span className="muted">{t("lockAuto", { k: fmtNum(targets.autoKcal) })}</span>
                  <button className="link" style={{ minHeight: 0, padding: 0 }} onClick={() => setKcalLock({ ...targets.lock, kcal: targets.autoKcal, shift: 0, since: localISO() })}>{t("lockUse")}</button>
                </div>
              )}
              <button className="btn soft sm" onClick={() => openSheet("weekly", { week: reportWeek(localISO()) })}>{t("wkOpenGoal")}</button>
              {srcs.length > 0 && <div className="small muted">{t("from", { list: srcs.join(" + ") })}</div>}
            </>
          ) : (
            <>
              <div className="small sub">{t("needProfile")}</div>
              <button className="btn soft" onClick={() => openSheet("profile")}>{t("addProfile")}</button>
            </>
          )}
        </div>
      )}

      {/* Coach */}
      {goal && tips?.length > 0 && (
        <div className="card warn">
          <div className="row strong" style={{ color: "var(--accent-text)", gap: 7 }}><Icon name="bolt" size={16} />{t("coach")}</div>
          {tips.map((tip) => (
            <div key={tip.key} className="body" style={{ color: "var(--text2)" }}>
              {tip.key === "rescan" && tip.params.days == null ? t("tip_rescanNone") : t(`tip_${tip.key}`, { ...tip.params, rate: tip.params.rate != null ? fmtNum(tip.params.rate, 2) : "" })}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
