// Train: today's session (from your plan or from muscles you pick), set logging
// with a 3-tap effort, double-progression advice, and same-muscle swaps.
import React, { useMemo, useState } from "react";
import { useApp } from "../ctx.js";
import { Icon, Chips, Photo, Note } from "../ui.jsx";
import { sb } from "../lib/api.js";
import { fmtNum, fmtDate } from "../lib/i18n.js";
import { BY_ID, GROUPS, MUSCLES, MUSCLE_NAMES } from "../lib/exercises.js";
import { liftHistory, recommend, setsText, recommendedCounts, adjustSession, slotMuscle, customMatch, MAX_PER_MUSCLE } from "../lib/train.js";
import { planDayFor, nextPlanDay, slotMinutes, WEEKDAYS_FULL } from "../lib/plan.js";
import { localISO } from "../lib/body.js";
import { coerceNumber } from "../lib/core.js";

const L = (lang) => (lang === "ar" ? 1 : 0);

export function sessionFromPlanDay(day) {
  return day.slots.map((s, i) => ({ id: `p${i}`, group: s.group, ex: s.ex, origEx: s.ex, sets: s.sets, reps: s.reps, muscle: GROUPS[s.group]?.muscle }));
}

// Your own exercise looks like a library one to the card.
const customEx = (slot) => ({ id: null, name: [slot.name, slot.name], gear: ["", ""], equip: [], img: null });

function Stepper({ value, min = 0, max, onChange, label }) {
  const { t } = useApp();
  return (
    <div className="row" style={{ gap: 6 }}>
      <button type="button" className="icon-btn" style={{ width: 40, height: 40 }} aria-label={`${t("minus")} · ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
      <span className="num" style={{ fontSize: 22, minWidth: 26, textAlign: "center" }} aria-live="polite">{value}</span>
      <button type="button" className="icon-btn" style={{ width: 40, height: 40 }} aria-label={`${t("plus")} · ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
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

function ExerciseCard({ slot, logs, session, setSession, open, onToggle, onRemove }) {
  const { t, lang, user, openSheet, refresh } = useApp();
  const ex = slot.custom ? customEx(slot) : BY_ID[slot.ex];
  const muscle = slotMuscle(slot);
  const g = slot.custom ? { muscle, main: MUSCLE_NAMES[muscle] || [muscle, muscle] } : GROUPS[slot.group];
  const today = localISO();
  const history = useMemo(() => (slot.custom ? liftHistory(logs, null, customMatch(slot.name)) : liftHistory(logs, slot.ex)).filter((h) => h.date < today), [logs, slot.ex, slot.name, slot.custom, today]);
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
      user_id: user.id, date: today, muscle_group: muscle, exercise: ex.name[0], exercise_id: ex.id,
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
    <div className="card tight" style={{ position: "relative" }}>
      <button className="row top" onClick={onToggle} aria-expanded={open} style={{ border: "none", background: "none", padding: 0, paddingInlineEnd: !done.length && onRemove ? 30 : 0, color: "inherit", textAlign: "start", width: "100%" }}>
        <Photo ex={ex} />
        <div className="grow col" style={{ gap: 3 }}>
          <div className="row wrap" style={{ gap: 6 }}>
            <span className="strong" style={{ fontSize: 15.5 }}>{ex.name[L(lang)]}</span>
            {swapped && <span className="tag muscle" style={{ fontSize: 10.5, padding: "1px 6px" }}>{t("swappedTag")}</span>}
          </div>
          {ex.gear[L(lang)] && <span className="small sub">{ex.gear[L(lang)]}</span>}
          <span className="small muted">{g.main[L(lang)]} · {t("setsReps", { s: slot.sets, lo: slot.reps[0], hi: slot.reps[1] })}</span>
          <span className="small muted ltr" style={{ textAlign: "start" }}>{last ? t("lastTxt", { sets: setsText(last.sets) }) : t("firstTime")}</span>
        </div>
        {done.length > 0 && <span className="tag ok" style={{ flex: "none" }}>{t("logged", { n: done.filter(Boolean).length, t: rows })}</span>}
      </button>
      {!done.length && onRemove && (
        <button className="del" onClick={onRemove} aria-label={`${t("remove")} ${ex.name[L(lang)]}`} style={{ position: "absolute", top: 8, insetInlineEnd: 8 }}><Icon name="close" size={16} /></button>
      )}
      <div className={`rec ${rec.kind}`}><b>{t(`rec_${rec.kind}`)}</b><span>{recText}</span></div>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn sm grow" onClick={onToggle}>{open ? t("done") : t("tapToLog")}</button>
        {!slot.custom && (
          <button className="btn sm" onClick={() => { setSession((s) => s); openSheet("swap", { src: "train", slotId: slot.id }); }} aria-label={`${t("swap")} ${ex.name[L(lang)]}`}>
            <Icon name="swap" size={16} />{t("swap")}
          </button>
        )}
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
  const { t, lang, data, user, trainSession: session, setTrainSession: setSession, refresh, toast, openSheet } = useApp();
  const [open, setOpen] = useState(null);
  const profile = data.profile || {};
  const today = localISO();
  const planDay = data.plan ? planDayFor(data.plan) : null;
  const next = data.plan && !planDay ? nextPlanDay(data.plan) : null;
  const mname = (m) => (MUSCLE_NAMES[m] || [m, m])[L(lang)];

  // Default: today's plan day if there is one.
  const active = session && session.date === today ? session : planDay ? { date: today, source: "plan", name: planDay.name, slots: sessionFromPlanDay(planDay), done: {} } : null;
  const setActive = (fn) => setSession((s) => fn(s && s.date === today ? s : active));
  const picking = active?.source !== "plan";
  const muscles = active?.muscles || [];
  const mode = active?.mode || "auto";
  const counts = active?.counts || {};
  const rec = useMemo(() => recommendedCounts({ muscles, logs: data.logs, profile }), [muscles.join(","), data.logs, profile]);   // eslint-disable-line react-hooks/exhaustive-deps

  const reshape = (base, patch) => {
    const nx = { ...base, ...patch };
    nx.slots = adjustSession(base.slots || [], { muscles: nx.muscles, counts: nx.counts, sets: nx.sets, logs: data.logs, profile });
    return nx;
  };
  const usePlanDay = () => setSession({ date: today, source: "plan", name: planDay.name, slots: sessionFromPlanDay(planDay), done: {} });
  const pickMuscle = (m) => {
    const base = picking && active ? active : { date: today, source: "pick", muscles: [], counts: {}, slots: [], done: {}, mode: "auto" };
    const ms = base.muscles.includes(m) ? base.muscles.filter((x) => x !== m) : [...base.muscles, m];
    const rc = recommendedCounts({ muscles: ms, logs: data.logs, profile });
    const cs = { ...(base.counts || {}) };
    if (!base.muscles.includes(m)) cs[m] = (base.mode || "auto") === "auto" ? rc[m] : 0; else delete cs[m];
    setSession(reshape(base, { muscles: ms, counts: cs }));
  };
  const setCount = (m, n) => setActive((s) => reshape(s, { counts: { ...(s.counts || {}), [m]: n } }));
  const setSets = (n) => setActive((s) => reshape(s, { sets: n }));
  const useSuggestion = () => setActive((s) => reshape(s, { mode: "auto", counts: { ...rec }, sets: null }));
  const setMode = (md) => setActive((s) => {
    if (md === "auto") return reshape(s, { mode: "auto", counts: { ...rec } });
    // "I'll choose": start empty, keeping anything already logged.
    const keep = (s.slots || []).filter((x) => x.manual || (s.done?.[x.id] || []).length).map((x) => ({ ...x, manual: true }));
    return { ...s, mode: "manual", counts: Object.fromEntries((s.muscles || []).map((m) => [m, 0])), slots: keep };
  });
  const removeSlot = (slot) => setActive((s) => {
    const slots = s.slots.filter((x) => x.id !== slot.id);
    const m = slotMuscle(slot);
    const cs = { ...(s.counts || {}) };
    if (!slot.manual && m in cs) cs[m] = slots.filter((x) => !x.manual && slotMuscle(x) === m).length;
    return { ...s, slots, counts: cs };
  });

  const slots = active?.slots || [];
  const minutes = Math.round(slots.reduce((a, s) => a + slotMinutes(s.sets, GROUPS[s.group]?.compound), 0) + 5);
  const setsDone = Object.values(active?.done || {}).reduce((a, l) => a + l.filter(Boolean).length, 0);
  const differs = mode !== "auto" || muscles.some((m) => (counts[m] ?? 0) !== rec[m]) || active?.sets;
  const suggestion = t("suggestLine", { list: muscles.map((m) => `${mname(m)} ${rec[m] ?? 0}`).join(" · "), s: 3 });

  const finish = async () => {
    if (!setsDone) { toast(t("noSets")); return; }
    const ms = [...new Set(slots.map(slotMuscle).filter(Boolean))];
    const dur = active.startedAt ? Math.max(1, Math.round((Date.now() - active.startedAt) / 60000)) : minutes;
    const { error } = await sb.insert("sessions", { user_id: user.id, date: today, duration_min: dur, muscles: ms.join(", ") });
    if (error) return;
    setActive((s) => ({ ...s, finished: true }));
    await refresh();
    toast(t("finished", { sets: setsDone, min: dur }));
  };
  const addExercise = () => { setActive((s) => s); openSheet("addEx", { muscle: muscles[0] || slotMuscle(slots[0] || {}) || "Chest" }); };

  return (
    <>
      <div className="screen-head">
        <div className="sub">{active?.source === "plan" && active.name ? t("trainToday", { name: active.name[L(lang)] }) : t("trainPick")}</div>
        <h1>{t("trainTitle")}</h1>
      </div>

      {data.plan && !planDay && next && (
        <Note kind="plain" icon="info">{t("restDay", { name: next.day.name[L(lang)], day: WEEKDAYS_FULL[next.day.weekday][L(lang)] })}</Note>
      )}

      {!picking ? (
        <button className="btn ghost" onClick={() => setSession({ date: today, source: "pick", muscles: [], counts: {}, slots: [], done: {}, mode: "auto" })}>{t("pickInstead")}</button>
      ) : (
        <div className="card">
          <div className="card-title">{t("pickMuscles")}</div>
          <div className="small muted">{t("pickHint")}</div>
          <Chips options={MUSCLES.map((m) => [m, mname(m)])} value={muscles} multi onChange={pickMuscle} />
          {planDay && <button className="btn soft" onClick={usePlanDay}>{t("usePlan")} · {planDay.name[L(lang)]}</button>}
        </div>
      )}

      {picking && muscles.length > 0 && (
        <div className="card">
          <div className="card-title">{t("buildMode")}</div>
          <div className="seg" role="tablist" aria-label={t("buildMode")}>
            {[["auto", t("modeSuggest")], ["manual", t("modeChoose")]].map(([v, l]) => (
              <button key={v} type="button" role="tab" aria-selected={mode === v} onClick={() => setMode(v)}>{l}</button>
            ))}
          </div>
          {mode === "auto" ? (
            <>
              <div className="label">{t("perMuscle")}</div>
              {muscles.map((m) => (
                <div key={m} className="row between">
                  <div>
                    <div className="strong">{mname(m)}</div>
                    <div className="small muted">{t("recN", { n: rec[m] ?? 0 })}</div>
                  </div>
                  <Stepper value={counts[m] ?? slots.filter((x) => !x.manual && slotMuscle(x) === m).length} max={MAX_PER_MUSCLE} onChange={(n) => setCount(m, n)} label={mname(m)} />
                </div>
              ))}
              <div className="divider" />
              <div className="row between">
                <div>
                  <div className="strong">{t("setsPer")}</div>
                  <div className="small muted">{t("recN", { n: 3 })}</div>
                </div>
                <Stepper value={active?.sets ?? 3} min={1} max={8} onChange={setSets} label={t("setsPer")} />
              </div>
            </>
          ) : (
            <div className="small sub">{t("chooseHint")}</div>
          )}
          <Note kind="plain" icon="bolt">{suggestion} {t("notRules")}</Note>
          {differs && <button className="btn soft sm" onClick={useSuggestion}>{t("useSuggestion")}</button>}
        </div>
      )}

      {slots.length > 0 && (
        <div className="row between" style={{ padding: "0 2px" }}>
          <span className="card-title">{t("sessionTitle")}</span>
          <span className="small muted">{t("sessionMeta", { n: slots.length, m: minutes })}</span>
        </div>
      )}
      {slots.map((slot) => (
        <ExerciseCard key={slot.id} slot={slot} logs={data.logs} session={active} setSession={setActive}
          open={open === slot.id} onToggle={() => setOpen(open === slot.id ? null : slot.id)} onRemove={() => removeSlot(slot)} />
      ))}
      {(slots.length > 0 || (picking && muscles.length > 0)) && !active?.finished && (
        <button className="btn" onClick={addExercise}><Icon name="plus" size={18} />{t("addExercise")}</button>
      )}
      {slots.length > 0 && (
        <>
          <div className="small muted center">{t("swapNote")}</div>
          {active.finished
            ? <Note>{t("sessionDone")} · {fmtDate(today, lang)}</Note>
            : <button className="btn primary lg" onClick={finish}>{t("finish")}</button>}
        </>
      )}
      {!slots.length && picking && !muscles.length && <div className="small muted center">{t("noMuscle")}</div>}
    </>
  );
}
