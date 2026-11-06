// Train: today's session (from your plan or from muscles you pick), set logging
// with a 3-tap effort, double-progression advice, and same-muscle swaps.
import React, { useMemo, useState } from "react";
import { useApp } from "../ctx.js";
import { Icon, Chips, Photo, Note } from "../ui.jsx";
import { sb } from "../lib/api.js";
import { fmtNum, fmtDate } from "../lib/i18n.js";
import { BY_ID, GROUPS, MUSCLES, MUSCLE_NAMES } from "../lib/exercises.js";
import { buildSession, liftHistory, recommend, setsText } from "../lib/train.js";
import { planDayFor, nextPlanDay, slotMinutes, WEEKDAYS_FULL } from "../lib/plan.js";
import { localISO } from "../lib/body.js";
import { coerceNumber } from "../lib/core.js";

const L = (lang) => (lang === "ar" ? 1 : 0);

export function sessionFromPlanDay(day) {
  return day.slots.map((s, i) => ({ id: `p${i}`, group: s.group, ex: s.ex, origEx: s.ex, sets: s.sets, reps: s.reps }));
}

function SetRow({ n, prev, initKg, initReps, done, onSave, bodyweight }) {
  const { t } = useApp();
  const [kg, setKg] = useState(done ? String(done.kg) : initKg != null ? String(initKg) : "");
  const [reps, setReps] = useState(done ? String(done.reps) : initReps != null ? String(initReps) : "");
  const [effort, setEffort] = useState(done?.effort || null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const r = coerceNumber(reps), w = bodyweight ? coerceNumber(kg) ?? 0 : coerceNumber(kg);
    if (!r || w == null) return;
    setBusy(true);
    await onSave({ kg: w, reps: Math.round(r), effort });
    setBusy(false);
  };
  return (
    <div className={`set-row${done ? " done" : ""}`}>
      <span className="n">{n}</span>
      <span className="prev ltr">{prev || "—"}</span>
      <input className="input sm" inputMode="decimal" aria-label={`${t("colKg")} ${n}`} value={kg} onChange={(e) => setKg(e.target.value)} disabled={!!done} />
      <input className="input sm" inputMode="numeric" aria-label={`${t("colReps")} ${n}`} value={reps} onChange={(e) => setReps(e.target.value)} disabled={!!done} />
      <button type="button" className={`check${done ? " on" : ""}`} onClick={save} disabled={!!done || busy} aria-label={`${t("saveSet")} ${n}`}><Icon name="check" size={18} stroke={2.6} /></button>
      <div className="effort" role="group" aria-label={`${t("colEffort")} ${n}`}>
        {["easy", "ok", "hard"].map((e) => (
          <button key={e} type="button" className={e} aria-pressed={effort === e} onClick={() => !done && setEffort(effort === e ? null : e)} disabled={!!done}>{t(e)}</button>
        ))}
      </div>
    </div>
  );
}

function ExerciseCard({ slot, logs, session, setSession, open, onToggle }) {
  const { t, lang, user, openSheet, refresh } = useApp();
  const ex = BY_ID[slot.ex];
  const g = GROUPS[slot.group];
  const today = localISO();
  const history = useMemo(() => liftHistory(logs, slot.ex).filter((h) => h.date < today), [logs, slot.ex, today]);
  const rec = recommend(slot.ex, history, slot.reps);
  const last = history[0];
  const swapped = slot.origEx && slot.ex !== slot.origEx;
  const done = session.done?.[slot.id] || [];
  const extra = session.extra?.[slot.id] || 0;
  const rows = Math.max(slot.sets + extra, done.length);
  const recText = t(`recT_${rec.kind}`, { w: fmtNum(rec.weight, 2), r: rec.reps, lo: slot.reps[0], hi: slot.reps[1] });
  const bodyweight = ex.equip.length === 1 && ex.equip[0] === "body";

  const saveSet = async (i, v) => {
    const row = {
      user_id: user.id, date: today, muscle_group: g.muscle, exercise: ex.name[0], exercise_id: ex.id,
      weight_kg: v.kg, reps: v.reps, effort: v.effort, set_no: i + 1,
    };
    const { data, error } = await sb.insert("workout_logs", row, { optional: ["exercise_id", "effort", "set_no"] });
    if (error) return;
    setSession((s) => {
      const d = { ...(s.done || {}) };
      const list = [...(d[slot.id] || [])];
      list[i] = { ...v, logId: data?.id };
      d[slot.id] = list;
      return { ...s, done: d, startedAt: s.startedAt || Date.now() };
    });
    refresh();
  };

  return (
    <div className="card tight">
      <button className="row top" onClick={onToggle} aria-expanded={open} style={{ border: "none", background: "none", padding: 0, color: "inherit", textAlign: "start", width: "100%" }}>
        <Photo ex={ex} />
        <div className="grow col" style={{ gap: 3 }}>
          <div className="row wrap" style={{ gap: 6 }}>
            <span className="strong" style={{ fontSize: 15.5 }}>{ex.name[L(lang)]}</span>
            {swapped && <span className="tag muscle" style={{ fontSize: 10.5, padding: "1px 6px" }}>{t("swappedTag")}</span>}
          </div>
          <span className="small sub">{ex.gear[L(lang)]}</span>
          <span className="small muted">{g.main[L(lang)]} · {t("setsReps", { s: slot.sets, lo: slot.reps[0], hi: slot.reps[1] })}</span>
          <span className="small muted ltr" style={{ textAlign: "start" }}>{last ? t("lastTxt", { sets: setsText(last.sets) }) : t("firstTime")}</span>
        </div>
        {done.length > 0 && <span className="tag ok" style={{ flex: "none" }}>{t("logged", { n: done.filter(Boolean).length, t: rows })}</span>}
      </button>
      <div className={`rec ${rec.kind}`}><b>{t(`rec_${rec.kind}`)}</b><span>{recText}</span></div>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn sm grow" onClick={onToggle}>{open ? t("done") : t("tapToLog")}</button>
        <button className="btn sm" onClick={() => { setSession((s) => s); openSheet("swap", { src: "train", slotId: slot.id }); }} aria-label={`${t("swap")} ${ex.name[L(lang)]}`}>
          <Icon name="swap" size={16} />{t("swap")}
        </button>
      </div>
      {open && (
        <div className="sets">
          <div className="set-row head"><span className="center">{t("colSet")}</span><span className="center">{t("colPrev")}</span><span className="center">{t("colKg")}</span><span className="center">{t("colReps")}</span><span /></div>
          {Array.from({ length: rows }, (_, i) => {
            const prev = last?.sets[i] || last?.sets[last.sets.length - 1];
            return (
              <SetRow key={`${slot.ex}-${i}`} n={i + 1} prev={prev ? `${+prev.weight_kg}×${prev.reps}` : ""}
                initKg={rec.weight ?? (bodyweight ? 0 : prev?.weight_kg)} initReps={rec.reps} done={done[i]} bodyweight={bodyweight}
                onSave={(v) => saveSet(i, v)} />
            );
          })}
          <div className="row between">
            <span className="small muted">{t("effortHint")}</span>
            <button className="link" onClick={() => setSession((s) => ({ ...s, extra: { ...(s.extra || {}), [slot.id]: extra + 1 } }))}>+ {t("colSet")}</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Train() {
  const { t, lang, data, user, trainSession: session, setTrainSession: setSession, refresh, toast } = useApp();
  const [open, setOpen] = useState(null);
  const profile = data.profile || {};
  const today = localISO();
  const planDay = data.plan ? planDayFor(data.plan) : null;
  const next = data.plan && !planDay ? nextPlanDay(data.plan) : null;

  // Default: today's plan day if there is one.
  const active = session && session.date === today ? session : planDay ? { date: today, source: "plan", name: planDay.name, slots: sessionFromPlanDay(planDay), done: {} } : null;

  const usePlanDay = () => setSession({ date: today, source: "plan", name: planDay.name, slots: sessionFromPlanDay(planDay), done: {} });
  const pickMuscle = (m) => {
    const base = active?.source === "pick" ? active : null;
    const muscles = [...(base?.muscles || [])];
    const i = muscles.indexOf(m);
    if (i >= 0) muscles.splice(i, 1); else muscles.push(m);
    const slots = buildSession({ muscles, logs: data.logs, profile }).map((s) => ({ ...s, origEx: s.ex }));
    setSession({ date: today, source: "pick", muscles, slots, done: {}, startedAt: base?.startedAt });
  };
  const slots = active?.slots || [];
  const minutes = Math.round(slots.reduce((a, s) => a + slotMinutes(s.sets, GROUPS[s.group]?.compound), 0) + 5);
  const setsDone = Object.values(active?.done || {}).reduce((a, l) => a + l.filter(Boolean).length, 0);
  const setActive = (fn) => setSession((s) => fn(s && s.date === today ? s : active));

  const finish = async () => {
    if (!setsDone) { toast(t("noSets")); return; }
    const muscles = [...new Set(slots.map((s) => GROUPS[s.group]?.muscle).filter(Boolean))];
    const dur = active.startedAt ? Math.max(1, Math.round((Date.now() - active.startedAt) / 60000)) : minutes;
    const { error } = await sb.insert("sessions", { user_id: user.id, date: today, duration_min: dur, muscles: muscles.join(", ") });
    if (error) return;
    setActive((s) => ({ ...s, finished: true }));
    await refresh();
    toast(t("finished", { sets: setsDone, min: dur }));
  };

  return (
    <>
      <div className="screen-head">
        <div className="sub">{active?.source === "plan" && active.name ? t("trainToday", { name: active.name[L(lang)] }) : t("trainPick")}</div>
        <h1>{t("trainTitle")}</h1>
      </div>

      {data.plan && !planDay && next && (
        <Note kind="plain" icon="info">{t("restDay", { name: next.day.name[L(lang)], day: WEEKDAYS_FULL[next.day.weekday][L(lang)] })}</Note>
      )}

      {active?.source === "plan" ? (
        <button className="btn ghost" onClick={() => setSession({ date: today, source: "pick", muscles: [], slots: [], done: {} })}>{t("pickInstead")}</button>
      ) : (
        <div className="card">
          <div className="card-title">{t("pickMuscles")}</div>
          <div className="small muted">{t("pickHint")}</div>
          <Chips options={MUSCLES.map((m) => [m, MUSCLE_NAMES[m][L(lang)]])} value={active?.muscles || []} multi onChange={pickMuscle} />
          {planDay && <button className="btn soft" onClick={usePlanDay}>{t("usePlan")} · {planDay.name[L(lang)]}</button>}
        </div>
      )}

      {slots.length > 0 && (
        <>
          <div className="row between" style={{ padding: "0 2px" }}>
            <span className="card-title">{t("sessionTitle")}</span>
            <span className="small muted">{t("sessionMeta", { n: slots.length, m: minutes })}</span>
          </div>
          {slots.map((slot) => (
            <ExerciseCard key={slot.id} slot={slot} logs={data.logs} session={active} setSession={setActive}
              open={open === slot.id} onToggle={() => setOpen(open === slot.id ? null : slot.id)} />
          ))}
          <div className="small muted center">{t("swapNote")}</div>
          {active.finished
            ? <Note>{t("sessionDone")} · {fmtDate(today, lang)}</Note>
            : <button className="btn primary lg" onClick={finish}>{t("finish")}</button>}
        </>
      )}
      {!slots.length && active?.source !== "plan" && <div className="small muted center">{t("noMuscle")}</div>}
    </>
  );
}
