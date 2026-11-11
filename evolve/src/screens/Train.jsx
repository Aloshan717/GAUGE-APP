// Train: today's session (from your plan, your last workout, or muscles you
// pick), set logging with a 3-tap effort, double-progression advice, your past
// weights, and same-muscle swaps.
import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../ctx.js";
import { Icon, Chips, Photo, Note, Stepper, MuscleMap } from "../ui.jsx";
import { sb, store } from "../lib/api.js";
import { fmtNum, fmtDate } from "../lib/i18n.js";
import { BY_ID, GROUPS, MUSCLES, MUSCLE_NAMES } from "../lib/exercises.js";
import { liftHistory, recommend, setsText, recommendedCounts, adjustSession, slotMuscle, customMatch, setAllSets, suggestedSets,
  pastWorkouts, lastTimeFor, slotsFromItems, sameExercise, bestOf, recordKind, recordIndex, volumeOf, restSeconds, MAX_PER_MUSCLE, MAX_SETS } from "../lib/train.js";
import { enqueue, patchQueued, dropQueued, tempId, isTemp } from "../lib/queue.js";
import { primeSound, scheduleBeep, cancelBeep, buzz } from "../lib/sound.js";
import { slotMuscles, muscleNames } from "../lib/muscles.js";
import { findMine } from "../lib/myex.js";
import { planDayFor, nextPlanDay, slotMinutes, WEEKDAYS_FULL } from "../lib/plan.js";
import { localISO } from "../lib/body.js";
import { coerceNumber } from "../lib/core.js";

const L = (lang) => (lang === "ar" ? 1 : 0);
const MODE_KEY = "evolve_train_mode";
const LTR = (s) => `\u2066${s}\u2069`;   // numbers keep their order inside Arabic text
export const exCount = (t, n) => t(n === 1 ? "nEx1" : n === 2 ? "nEx2" : "nEx", { n });

// Rows shown for a slot, and whether every one of them is saved.
const rowsOf = (slot, session) => Math.max(slot.sets + (session?.extra?.[slot.id] || 0), (session?.done?.[slot.id] || []).length);
const isComplete = (slot, session) => {
  const rows = rowsOf(slot, session);
  return rows > 0 && (session?.done?.[slot.id] || []).filter(Boolean).length >= rows;
};

export function sessionFromPlanDay(day) {
  return day.slots.map((s, i) => ({ id: `p${i}`, group: s.group, ex: s.ex, origEx: s.ex, sets: s.sets, reps: s.reps, muscle: GROUPS[s.group]?.muscle }));
}

// Your own exercise looks like a library one to the card.
const customEx = (slot, own) => ({ id: null, name: [slot.name, slot.name], gear: ["", ""], equip: [], img: null, photo: own?.photo || null });

// The last few times you did this exercise: date and every set.
function History({ history, onAll }) {
  const { t, lang } = useApp();
  if (!history.length) return null;
  return (
    <div className="hist">
      <div className="label">{t("histTitle")}</div>
      {history.slice(0, 4).map((h) => (
        <div key={h.date} className="hist-row">
          <span className="d">{fmtDate(h.date, lang, "day")}</span>
          <span className="v">{LTR(setsText(h.sets))}</span>
        </div>
      ))}
      {history.length > 4 && <button type="button" className="link" style={{ minHeight: 30, padding: 0, alignSelf: "flex-start" }} onClick={onAll}>{t("histAll", { n: history.length })}</button>}
    </div>
  );
}

// One set: kg, reps, how it felt. A saved set stays editable — change anything
// and ✓ saves the change; the bin removes it (tap twice).
function SetRow({ n, prev, initKg, initReps, done, onSave, onDelete, bodyweight, pr }) {
  const { t } = useApp();
  const [kg, setKg] = useState(done ? String(done.kg) : initKg != null ? String(initKg) : "");
  const [reps, setReps] = useState(done ? String(done.reps) : initReps != null ? String(initReps) : "");
  const [effort, setEffort] = useState(done?.effort || null);
  const [busy, setBusy] = useState(false);
  const [arm, setArm] = useState(false);
  const w = bodyweight ? coerceNumber(kg) ?? 0 : coerceNumber(kg);
  const r = coerceNumber(reps);
  const valid = !!r && w != null;
  const changed = !!done && (w !== done.kg || Math.round(r || 0) !== done.reps || (effort || null) !== (done.effort || null));
  useEffect(() => {
    if (!arm) return undefined;
    const id = setTimeout(() => setArm(false), 3500);
    return () => clearTimeout(id);
  }, [arm]);
  const save = async () => {
    if (!valid || busy || (done && !changed)) return;
    primeSound();   // inside the tap, so the rest timer may beep later
    setBusy(true);
    await onSave({ kg: w, reps: Math.round(r), effort });
    setBusy(false);
  };
  const del = async () => {
    if (!arm) { setArm(true); return; }
    setArm(false); setBusy(true);
    await onDelete();
    setBusy(false);
  };
  const what = changed ? t("saveChange") : done?.pending ? t("setWaiting") : done ? t("setSaved") : t("saveSet");
  return (
    <div className={`set-row${done ? " done" : ""}${changed ? " changed" : ""}`}>
      <span className="n">{pr ? <span title={t("prTag")} aria-label={t("prTag")}>🏆</span> : n}</span>
      <span className="prev ltr">{prev || "—"}</span>
      <input className="input sm" inputMode="decimal" aria-label={`${t("colKg")} ${n}`} value={kg} onChange={(e) => setKg(e.target.value)} />
      <input className="input sm" inputMode="numeric" aria-label={`${t("colReps")} ${n}`} value={reps} onChange={(e) => setReps(e.target.value)} />
      <button type="button" className={`check${done && !changed ? " on" : ""}${changed ? " dirty" : ""}${done?.pending && !changed ? " pending" : ""}`} onClick={save} disabled={busy} aria-label={`${what} ${n}`}><Icon name="check" size={18} stroke={2.6} /></button>
      <div className="effort-line">
        <div className="effort" role="group" aria-label={`${t("colEffort")} ${n}`}>
          {["easy", "ok", "hard"].map((e) => (
            <button key={e} type="button" className={e} aria-pressed={effort === e} onClick={() => setEffort(effort === e ? null : e)}>{t(e)}</button>
          ))}
        </div>
        {done && (
          <button type="button" className={`del${arm ? " arm" : ""}`} onClick={del} disabled={busy} aria-label={arm ? `${t("delQ")} ${n}` : `${t("deleteSet")} ${n}`}>
            {arm ? t("delQ") : <Icon name="trash" size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}

function ExerciseCard({ slot, logs, session, setSession, open, onToggle, onRemove, onComplete, onRest }) {
  const { t, lang, user, openSheet, refresh, toast } = useApp();
  const own = slot.custom ? findMine(slot.name) : null;
  const ex = slot.custom || !BY_ID[slot.ex] ? customEx({ ...slot, name: slot.name || String(slot.ex || "?") }, own) : BY_ID[slot.ex];
  const muscle = slotMuscle(slot);
  const works = slotMuscles(slot.custom ? { ...slot, parts: slot.parts || own?.parts } : slot);
  const today = localISO();
  const history = useMemo(() => (slot.custom ? liftHistory(logs, null, customMatch(slot.name)) : liftHistory(logs, slot.ex)).filter((h) => h.date < today), [logs, slot.ex, slot.name, slot.custom, today]);
  const rec = recommend(slot.ex, history, slot.reps);
  const last = history[0];
  const swapped = slot.origEx && slot.ex !== slot.origEx;
  const done = session.done?.[slot.id] || [];
  const saved = done.filter(Boolean).length;
  const extra = session.extra?.[slot.id] || 0;
  const rows = Math.max(slot.sets + extra, done.length);
  const complete = rows > 0 && saved >= rows;
  const recText = t(`recT_${rec.kind}`, { w: fmtNum(rec.weight, 2), r: rec.reps, lo: slot.reps[0], hi: slot.reps[1] });
  const bodyweight = ex.equip.length === 1 && ex.equip[0] === "body";
  const name = ex.name[L(lang)];
  const main = muscleNames(works.primary, lang), helps = muscleNames(works.secondary, lang);
  const info = () => openSheet("exInfo", slot.custom ? { name: slot.name, muscle } : { ex: slot.ex });

  const storeDone = (i, v) => setSession((s) => {
    const d = { ...(s.done || {}) };
    const list = [...(d[slot.id] || [])];
    list[i] = v || null;
    while (list.length && !list[list.length - 1]) list.pop();
    d[slot.id] = list;
    return { ...s, done: d, startedAt: s.startedAt || Date.now() };
  });
  const insertSet = (i, v) => sb.insert("workout_logs", {
    user_id: user.id, date: today, muscle_group: muscle, exercise: ex.name[0], exercise_id: ex.id,
    weight_kg: v.kg, reps: v.reps, effort: v.effort, set_no: i + 1,
  }, { optional: ["exercise_id", "effort", "set_no"], quiet: true });

  const best = useMemo(() => bestOf(history), [history]);
  const prAt = recordIndex(done, best);
  // No signal: keep it on the phone; it is sent as soon as you're online.
  const offline = () => toast(t("savedOffline"));
  const fields = (v) => ({ weight_kg: v.kg, reps: v.reps, effort: v.effort });

  const saveSet = async (i, v) => {
    const fresh = !done[i];
    const oldId = done[i]?.logId;
    let id = oldId, pending = false;
    if (oldId && isTemp(oldId)) {
      patchQueued(user.id, oldId, fields(v));          // still waiting to be sent: change the waiting copy
      pending = true;
    } else if (oldId) {
      // Correct a saved set. Where the database doesn't allow edits, save it
      // again and remove the old one — your history ends up the same.
      const { data, error, network } = await sb.update("workout_logs", oldId, fields(v), { optional: ["effort"], quiet: true });
      if (network) { enqueue(user.id, { op: "update", table: "workout_logs", id: oldId, data: fields(v), optional: ["effort"] }); pending = true; offline(); }
      else if (error) { toast(error); return; }
      else if (!data) {
        const ins = await insertSet(i, v);
        if (ins.error) { toast(ins.error); return; }
        id = ins.data?.id;
        await sb.delete("workout_logs", oldId, { quiet: true });
      }
    } else {
      const row = { user_id: user.id, date: today, muscle_group: muscle, exercise: ex.name[0], exercise_id: ex.id, weight_kg: v.kg, reps: v.reps, effort: v.effort, set_no: i + 1 };
      const { data, error, network } = await sb.insert("workout_logs", row, { optional: ["exercise_id", "effort", "set_no"], quiet: true });
      if (network) {
        id = tempId();
        enqueue(user.id, { op: "insert", table: "workout_logs", data: row, optional: ["exercise_id", "effort", "set_no"], temp: id });
        pending = true;
        offline();
      } else if (error) { if (error !== "setup") toast(error); return; }
      else id = data?.id;
    }
    storeDone(i, { ...v, logId: id, pending });
    if (!pending) refresh();
    // A new best? Say it once per exercise per workout.
    const kind = recordKind(v, best);
    if (kind && !session.prs?.[slot.id]) {
      toast(t(`pr_${kind}`, { name, v: kind === "reps" ? v.reps : fmtNum(v.kg, 2) }));
    }
    if (kind) setSession((s) => {
      const was = s.prs?.[slot.id];
      const score = v.kg > 0 ? v.kg * (1 + Math.min(v.reps, 12) / 30) : v.reps;
      return was && was.score >= score ? s : { ...s, prs: { ...(s.prs || {}), [slot.id]: { name: ex.name, kind, kg: v.kg, reps: v.reps, score } } };
    });
    if (fresh) {
      onRest?.(slot);
      if (saved + 1 >= rows) onComplete?.();
    }
  };
  const deleteSet = async (i) => {
    const id = done[i]?.logId;
    if (id && isTemp(id)) dropQueued(user.id, id);       // never sent: nothing to delete on the server
    else if (id) {
      const { error, network } = await sb.delete("workout_logs", id, { quiet: true });
      if (network) { enqueue(user.id, { op: "delete", table: "workout_logs", id }); offline(); }
      else if (error) { toast(error); return; }
    }
    storeDone(i, null);
    refresh();
  };
  const setSets = (n) => setSession((s) => ({
    ...s,
    slots: s.slots.map((x) => (x.id === slot.id ? { ...x, sets: n } : x)),
    extra: { ...(s.extra || {}), [slot.id]: 0 },
  }));

  const todayText = done.filter(Boolean).map((d) => `${+d.kg}×${d.reps}`).join(" · ");
  return (
    <div id={`ex-${slot.id}`} className={`card tight ex-card${complete ? " complete" : ""}`}>
      <div className="row top">
        <button type="button" className="ex-media" onClick={info} aria-label={t("exInfoA11y", { name })}>
          <Photo ex={ex} />
          {complete && <span className="done-badge" aria-hidden="true"><Icon name="check" size={15} stroke={3} /></span>}
        </button>
        <button type="button" className="grow col" onClick={onToggle} aria-expanded={open} style={{ gap: 3, border: "none", background: "none", padding: 0, color: "inherit", textAlign: "start" }}>
          <span className="row wrap" style={{ gap: 6 }}>
            <span className="strong" style={{ fontSize: 15.5 }}>{name}</span>
            {swapped && <span className="tag muscle" style={{ fontSize: 10.5, padding: "1px 6px" }}>{t("swappedTag")}</span>}
            {complete
              ? <span className="tag ok" style={{ fontSize: 10.5, padding: "1px 6px" }}>✓ {t("exDone")}</span>
              : saved > 0 && <span className="tag ok" style={{ fontSize: 10.5, padding: "1px 6px" }}>{t("logged", { n: saved, t: rows })}</span>}
          </span>
          {ex.gear[L(lang)] && <span className="small sub">{ex.gear[L(lang)]}</span>}
          <span className="small muted">{t("setsReps", { s: rows, lo: slot.reps[0], hi: slot.reps[1] })}</span>
          <span className="small muted">{last ? t("lastTxt", { sets: LTR(setsText(last.sets)) }) : t("firstTime")}</span>
        </button>
        <button type="button" className="mmap-btn" onClick={info} aria-label={t("worksA11y", { list: [...main, ...helps].join(", ") })}>
          <MuscleMap muscles={works} height={64} views="main" zoom group={slot.group} />
        </button>
      </div>
      <div className="muscle-line">
        <span className="dot" />
        <span><b style={{ color: "var(--text)" }}>{main.join(" · ")}</b>{helps.length > 0 && <span className="muted"> · {t("helpsTxt", { list: helps.join("، ") })}</span>}</span>
      </div>
      {complete
        ? <div className="today-line"><Icon name="check" size={15} stroke={2.6} color="var(--accent)" /><span>{t("todayDid", { sets: LTR(todayText) })}</span></div>
        : <div className={`rec ${rec.kind}`}><b>{t(`rec_${rec.kind}`)}</b><span>{recText}</span></div>}
      <div className="row" style={{ gap: 8 }}>
        <button className={`btn sm grow${complete && !open ? " soft" : ""}`} onClick={onToggle}>{open ? t("done") : complete ? t("editSets") : t("tapToLog")}</button>
        {!slot.custom && !complete && (
          <button className="btn sm" onClick={() => openSheet("swap", { src: "train", slotId: slot.id })} aria-label={`${t("swap")} ${name}`}>
            <Icon name="swap" size={16} />{t("swap")}
          </button>
        )}
        {!saved && onRemove && (
          <button className="btn sm" onClick={onRemove} aria-label={`${t("remove")} ${name}`} style={{ paddingInline: 11, color: "var(--muted)" }}><Icon name="trash" size={16} /></button>
        )}
      </div>
      {open && (
        <div className="sets">
          <div className="row between">
            <div>
              <div className="strong" style={{ fontSize: 14 }}>{t("setsThis")}</div>
              <div className="small muted">{t("setsThisHint")}</div>
            </div>
            <Stepper small value={rows} min={Math.max(1, done.length)} max={MAX_SETS} onChange={setSets} label={`${t("setsThis")} · ${name}`} />
          </div>
          <History history={history} onAll={info} />
          <div className="set-row head"><span className="center">{t("colSet")}</span><span className="center">{t("colPrev")}</span><span className="center">{t("colKg")}</span><span className="center">{t("colReps")}</span><span /></div>
          {Array.from({ length: rows }, (_, i) => {
            const prev = last?.sets[i] || last?.sets[last.sets.length - 1];
            return (
              <SetRow key={`${slot.ex || slot.name}-${i}`} n={i + 1} prev={prev ? `${+prev.weight_kg}×${prev.reps}` : ""}
                initKg={rec.weight ?? (bodyweight ? 0 : prev?.weight_kg)} initReps={rec.reps} done={done[i] || null} bodyweight={bodyweight}
                pr={i === prAt} onSave={(v) => saveSet(i, v)} onDelete={() => deleteSet(i)} />
            );
          })}
          <div className="small muted">{t("effortHint")} {t("editHint")}</div>
        </div>
      )}
    </div>
  );
}

// Rest between sets: a countdown above the menu, ±15 s (remembered), beep at the end.
function RestBar({ rest, onAdjust, onSkip }) {
  const { t } = useApp();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    document.body.classList.add("has-rest");
    return () => { clearInterval(id); document.body.classList.remove("has-rest"); };
  }, []);
  const left = Math.ceil((rest.endsAt - now) / 1000);
  const over = left <= 0;
  useEffect(() => { if (over) buzz(); }, [over]);
  useEffect(() => { if (left < -10) onSkip(); }, [left < -10]);   // eslint-disable-line react-hooks/exhaustive-deps
  const pct = over ? 100 : Math.max(0, Math.min(100, 100 - (left / rest.total) * 100));
  const mm = Math.floor(Math.max(0, left) / 60), ss = String(Math.max(0, left) % 60).padStart(2, "0");
  return (
    <div className={`rest-bar${over ? " over" : ""}`} role="timer" aria-live={over ? "assertive" : "off"}>
      <div className="rest-fill" style={{ width: `${pct}%` }} />
      <div className="rest-in">
        <Icon name={over ? "check" : "watch"} size={18} />
        <span className="rest-lbl">{over ? t("restOver") : t("restLbl")}</span>
        {!over && <span className="num rest-time ltr">{mm}:{ss}</span>}
        <span className="grow" />
        {!over && <button type="button" onClick={() => onAdjust(-15)} aria-label={t("restLess")}>−15</button>}
        {!over && <button type="button" onClick={() => onAdjust(15)} aria-label={t("restMore")}>+15</button>}
        <button type="button" className="skip" onClick={onSkip}>{over ? t("close") : t("restSkip")}</button>
      </div>
    </div>
  );
}

// Your recent workouts — one tap repeats the same exercises and sets.
function RepeatList({ workouts, onRepeat, current }) {
  const { t, lang } = useApp();
  if (!workouts.length) return null;
  const mname = (m) => (MUSCLE_NAMES[m] || [m, m])[L(lang)];
  return (
    <div className="col" style={{ gap: 8 }}>
      <div className="label">{t("repeatTitle")}</div>
      {workouts.slice(0, 3).map((w) => (
        <button key={w.date} type="button" className="repeat-btn" aria-pressed={current === w.date} onClick={() => onRepeat(w)}>
          <Icon name="repeat" size={18} />
          <span className="grow col" style={{ gap: 1 }}>
            <span className="strong">{fmtDate(w.date, lang, "day")}</span>
            <span className="small muted">{w.muscles.map(mname).join(" + ") || "—"} · {exCount(t, w.items.length)}</span>
          </span>
          <span className="small strong" style={{ color: "var(--accent-text)" }}>{t("repeatBtn")}</span>
        </button>
      ))}
    </div>
  );
}

export default function Train() {
  const { t, lang, data, user, trainSession: session, setTrainSession: setSession, refresh, toast, openSheet, pending } = useApp();
  const [open, setOpen] = useState(null);
  const profile = data.profile || {};
  const today = localISO();
  const planDay = data.plan ? planDayFor(data.plan) : null;
  const next = data.plan && !planDay ? nextPlanDay(data.plan) : null;
  const mname = (m) => (MUSCLE_NAMES[m] || [m, m])[L(lang)];
  const workouts = useMemo(() => pastWorkouts(data.logs, { before: today }), [data.logs, today]);
  const defaultMode = () => store.get(MODE_KEY) || (workouts.length ? "last" : "auto");

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

  // Same as last time: each muscle's exercises from the last time you trained
  // it, with the sets you did (the suggestion when there is no past workout).
  const lastSlots = (m, ms) => {
    const last = lastTimeFor(m, workouts);
    if (last) return { date: last.date, slots: slotsFromItems(last.items, { profile, muscle: m, mine: findMine }) };
    const rc = recommendedCounts({ muscles: ms, logs: data.logs, profile });
    return { date: null, slots: adjustSession([], { muscles: [m], counts: { [m]: rc[m] ?? 2 }, logs: data.logs, profile }) };
  };
  const buildLast = (base, ms) => {
    let out = (base.slots || []).filter((x) => (base.done?.[x.id] || []).some(Boolean));
    const from = {};
    for (const m of ms) {
      const l = lastSlots(m, ms);
      from[m] = l.date;
      out = out.concat(l.slots.filter((x) => !out.some((y) => sameExercise(x, y))));
    }
    return { ...base, mode: "last", muscles: ms, lastFrom: from, slots: out, extra: {} };
  };
  const repeat = (w) => {
    store.set(MODE_KEY, "last");
    const ms = w.muscles.filter((m) => MUSCLES.includes(m));
    setSession({ date: today, source: "pick", mode: "last", muscles: ms, counts: {}, done: {}, repeatOf: w.date,
      lastFrom: Object.fromEntries(ms.map((m) => [m, w.date])), slots: slotsFromItems(w.items, { profile, mine: findMine }) });
    setOpen(null);
  };

  const pickMuscle = (m) => {
    const base = picking && active ? active : { date: today, source: "pick", muscles: [], counts: {}, slots: [], done: {}, mode: defaultMode() };
    const ms = base.muscles.includes(m) ? base.muscles.filter((x) => x !== m) : [...base.muscles, m];
    if ((base.mode || "auto") === "last") {
      if (base.muscles.includes(m)) {
        const lf = { ...(base.lastFrom || {}) };
        delete lf[m];
        setSession({ ...base, muscles: ms, lastFrom: lf, repeatOf: null, slots: (base.slots || []).filter((x) => slotMuscle(x) !== m || (base.done?.[x.id] || []).some(Boolean)) });
      } else {
        const l = lastSlots(m, ms);
        const slots = [...(base.slots || [])];
        l.slots.forEach((x) => { if (!slots.some((y) => sameExercise(x, y))) slots.push(x); });
        setSession({ ...base, muscles: ms, slots, repeatOf: null, lastFrom: { ...(base.lastFrom || {}), [m]: l.date } });
      }
      return;
    }
    const rc = recommendedCounts({ muscles: ms, logs: data.logs, profile });
    const cs = { ...(base.counts || {}) };
    if (!base.muscles.includes(m)) cs[m] = (base.mode || "auto") === "auto" ? rc[m] : 0; else delete cs[m];
    setSession(reshape(base, { muscles: ms, counts: cs }));
  };
  const setCount = (m, n) => setActive((s) => reshape(s, { counts: { ...(s.counts || {}), [m]: n } }));
  const setSets = (n) => setActive((s) => ({ ...s, sets: n, extra: {}, slots: setAllSets(s.slots || [], n, s.done) }));
  const useSuggestion = () => setActive((s) => {
    const nx = reshape(s, { mode: "auto", counts: { ...rec }, sets: null });
    return { ...nx, extra: {}, slots: suggestedSets(nx.slots, profile, nx.done) };
  });
  const setMode = (md) => setActive((s) => {
    store.set(MODE_KEY, md);
    if (md === "last") return buildLast(s, s.muscles || []);
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
  const differs = mode === "manual" || (mode === "auto" && (muscles.some((m) => (counts[m] ?? 0) !== rec[m]) || active?.sets));
  const completeCount = slots.filter((x) => isComplete(x, active)).length;
  // A finished exercise closes and the next unfinished one opens.
  const advance = (id) => {
    const i = slots.findIndex((x) => x.id === id);
    const nextSlot = [...slots.slice(i + 1), ...slots.slice(0, Math.max(0, i))].find((x) => x.id !== id && !isComplete(x, active));
    setTimeout(() => {
      setOpen(nextSlot ? nextSlot.id : null);
      if (nextSlot) setTimeout(() => document.getElementById(`ex-${nextSlot.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
      else toast(t("allDone"));
    }, 700);
  };
  const suggestion = t("suggestLine", { list: muscles.map((m) => `${mname(m)} ${rec[m] ?? 0}`).join(" · "), s: 3 });

  // Rest timer: starts after every new set; big lifts rest longer.
  const restKey = (big) => `evolve_rest_${big ? "big" : "small"}`;
  const startRest = (slot) => {
    const big = !!GROUPS[slot.group]?.compound;
    const secs = restSeconds({ compound: big, focus: profile.focus, saved: Number(store.get(restKey(big))) || 0 });
    const endsAt = Date.now() + secs * 1000;
    scheduleBeep(endsAt);
    setActive((s) => ({ ...s, rest: { endsAt, total: secs, big } }));
  };
  const adjustRest = (d) => setActive((s) => {
    if (!s.rest) return s;
    const total = Math.max(30, s.rest.total + d);
    const endsAt = Math.max(Date.now() + 5000, s.rest.endsAt + d * 1000);
    store.set(restKey(s.rest.big), String(total));
    scheduleBeep(endsAt);
    return { ...s, rest: { ...s.rest, total, endsAt } };
  });
  const skipRest = () => { cancelBeep(); setActive((s) => ({ ...s, rest: null })); };

  const finish = async () => {
    if (!setsDone) { toast(t("noSets")); return; }
    const ms = [...new Set(slots.map(slotMuscle).filter(Boolean))];
    const dur = active.startedAt ? Math.max(1, Math.round((Date.now() - active.startedAt) / 60000)) : minutes;
    const row = { user_id: user.id, date: today, duration_min: dur, muscles: ms.join(", ") };
    const { error, network } = await sb.insert("sessions", row, { quiet: true });
    if (network) enqueue(user.id, { op: "insert", table: "sessions", data: row });
    else if (error) { if (error !== "setup") toast(error); return; }
    // Summary: time, sets, weight moved, records, and how it compares with the last time.
    const doneSets = slots.flatMap((x) => (active.done?.[x.id] || []).filter(Boolean));
    const volume = volumeOf(doneSets);
    const lastSame = workouts.find((w) => w.muscles.some((m) => ms.includes(m)));
    const lastVolume = lastSame ? volumeOf((data.logs || []).filter((l) => l.date === lastSame.date && ms.includes(l.muscle_group)).map((l) => ({ kg: Number(l.weight_kg), reps: Number(l.reps) }))) : 0;
    const summary = {
      date: today, minutes: dur, sets: doneSets.length, volume, muscles: ms,
      exercises: slots.filter((x) => (active.done?.[x.id] || []).some(Boolean)).length,
      records: Object.values(active.prs || {}), lastDate: lastSame?.date || null, lastVolume,
    };
    cancelBeep();
    setActive((s) => ({ ...s, finished: true, finishPending: !!network, rest: null, summary }));
    if (!network) await refresh();
    openSheet("summary", { summary });
  };
  const addExercise = () => { setActive((s) => s); openSheet("addEx", { muscle: muscles[0] || slotMuscle(slots[0] || {}) || "Chest" }); };

  return (
    <>
      <div className="screen-head">
        <div className="sub">{active?.source === "plan" && active.name ? t("trainToday", { name: active.name[L(lang)] }) : t("trainPick")}</div>
        <h1>{t("trainTitle")}</h1>
      </div>

      {pending > 0 && <Note kind="plain" icon="info">{t("pendingSync", { n: pending })}</Note>}

      {data.plan && !planDay && next && (
        <Note kind="plain" icon="info">{t("restDay", { name: next.day.name[L(lang)], day: WEEKDAYS_FULL[next.day.weekday][L(lang)] })}</Note>
      )}

      {!picking ? (
        <>
          <button className="btn ghost" onClick={() => setSession({ date: today, source: "pick", muscles: [], counts: {}, slots: [], done: {}, mode: defaultMode() })}>{t("pickInstead")}</button>
          {!setsDone && <RepeatList workouts={workouts} onRepeat={repeat} />}
        </>
      ) : (
        <div className="card">
          <div className="card-title">{t("pickMuscles")}</div>
          <div className="small muted">{t("pickHint")}</div>
          <Chips options={MUSCLES.map((m) => [m, mname(m)])} value={muscles} multi onChange={pickMuscle} />
          {planDay && <button className="btn soft" onClick={usePlanDay}>{t("usePlan")} · {planDay.name[L(lang)]}</button>}
          {!setsDone && workouts.length > 0 && <><div className="divider" /><RepeatList workouts={workouts} onRepeat={repeat} current={active?.repeatOf} /></>}
        </div>
      )}

      {picking && muscles.length > 0 && (
        <div className="card">
          <div className="card-title">{t("buildMode")}</div>
          <div className="seg" role="tablist" aria-label={t("buildMode")}>
            {[["last", t("modeLast")], ["auto", t("modeSuggest")], ["manual", t("modeChoose")]].map(([v, l]) => (
              <button key={v} type="button" role="tab" aria-selected={mode === v} onClick={() => setMode(v)}>{l}</button>
            ))}
          </div>
          {mode === "last" ? (
            <>
              {muscles.map((m) => {
                const d = active?.lastFrom?.[m];
                const n = slots.filter((x) => slotMuscle(x) === m).length;
                return (
                  <div key={m} className="row between">
                    <div className="strong">{mname(m)}</div>
                    <div className="small muted" style={{ textAlign: "end" }}>{d ? t("lastFrom", { date: fmtDate(d, lang, "day"), count: exCount(t, n) }) : t("lastNone")}</div>
                  </div>
                );
              })}
              <div className="small sub">{t("lastHint")}</div>
            </>
          ) : mode === "auto" ? (
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
                  <div className="small muted">{t("setsPerHint")}</div>
                </div>
                <Stepper value={active?.sets ?? 3} min={1} max={MAX_SETS} onChange={setSets} label={t("setsPer")} />
              </div>
            </>
          ) : (
            <div className="small sub">{t("chooseHint")}</div>
          )}
          {mode !== "last" && <Note kind="plain" icon="bolt">{suggestion} {t("notRules")}</Note>}
          {differs && <button className="btn soft sm" onClick={useSuggestion}>{t("useSuggestion")}</button>}
        </div>
      )}

      {slots.length > 0 && (
        <div className="row between" style={{ padding: "0 2px" }}>
          <span className="card-title">{t("sessionTitle")}</span>
          <span className="small muted">{t("sessionMeta", { n: slots.length, m: minutes })}{completeCount > 0 && <b style={{ color: "var(--accent-text)" }}> · {t("doneCount", { d: completeCount, n: slots.length })}</b>}</span>
        </div>
      )}
      {slots.map((slot) => (
        <ExerciseCard key={slot.id} slot={slot} logs={data.logs} session={active} setSession={setActive}
          open={open === slot.id} onToggle={() => setOpen(open === slot.id ? null : slot.id)} onRemove={() => removeSlot(slot)} onComplete={() => advance(slot.id)} onRest={startRest} />
      ))}
      {(slots.length > 0 || (picking && muscles.length > 0)) && !active?.finished && (
        <button className="btn" onClick={addExercise}><Icon name="plus" size={18} />{t("addExercise")}</button>
      )}
      {slots.length > 0 && (
        <>
          <div className="small muted center">{t("swapNote")}</div>
          {active.finished
            ? <>
                <Note>{t("sessionDone")} · {fmtDate(today, lang)}</Note>
                {active.summary && <button className="btn soft" onClick={() => openSheet("summary", { summary: active.summary })}>{t("seeSummary")}</button>}
              </>
            : <button className={`btn primary lg${completeCount === slots.length ? " glow" : ""}`} onClick={finish}>{t("finish")}</button>}
        </>
      )}
      {!slots.length && picking && !muscles.length && <div className="small muted center">{t("noMuscle")}</div>}
      {active?.rest && !active.finished && <RestBar rest={active.rest} onAdjust={adjustRest} onSkip={skipRest} />}
    </>
  );
}
