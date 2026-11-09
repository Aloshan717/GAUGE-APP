// Plan builder: 1 about you · 2 your training · 3 review the week (keep / swap) → approve.
import React, { useEffect, useMemo } from "react";
import { useApp } from "../ctx.js";
import { Icon, Chips, Field, Photo, Stepper, MuscleMap } from "../ui.jsx";
import { sb } from "../lib/api.js";
import { fmtDate, fmtNum } from "../lib/i18n.js";
import { BY_ID } from "../lib/exercises.js";
import { generatePlan, splitFor, weeklySets, toggleKept, setSlotSets, reviewCount, DEFAULT_DAYS, WEEKDAYS, WEEKDAYS_FULL } from "../lib/plan.js";
import { musclesOf, muscleNames } from "../lib/muscles.js";
import { ageFrom } from "../lib/body.js";
import { coerceNumber } from "../lib/core.js";

const PAIN = ["shoulder", "back", "knee", "wrist"];

function answersFrom(profile, planRow) {
  const p = profile || {}, a = planRow?.answers || {};
  return {
    sex: p.sex || a.sex || "", age: ageFrom(p.birth_year) ? String(ageFrom(p.birth_year)) : a.age || "", height: p.height_cm ? String(p.height_cm) : a.height || "",
    activity: p.activity || a.activity || "sit", experience: p.experience || a.experience || "mid",
    train_days: p.train_days?.length ? p.train_days : a.train_days || DEFAULT_DAYS[4], session_min: p.session_min || a.session_min || 60,
    equipment: p.equipment || a.equipment || "gym", focus: p.focus || a.focus || "muscle", pain: p.pain?.length ? p.pain : a.pain || [], cardio: p.cardio || a.cardio || "none",
  };
}

function Question({ label, hint, children }) {
  return (
    <div className="card tight">
      <div className="strong" style={{ fontSize: 14.5 }}>{label}</div>
      {hint && <div className="small muted">{hint}</div>}
      {children}
    </div>
  );
}

export default function Planner() {
  const { t, lang, theme, data, derived, user, planDraft, setPlanDraft, setTab, changeTheme, changeLang, saveProfile, refresh, toast, openSheet, rtl } = useApp();
  const L = lang === "ar" ? 1 : 0;

  // Start a draft: editing an approved plan opens at the review step.
  useEffect(() => {
    if (planDraft) return;
    const answers = answersFrom(data.profile, data.planRow);
    setPlanDraft(data.plan ? { step: 3, answers, plan: data.plan } : { step: 1, answers, plan: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const d = planDraft || { step: 1, answers: answersFrom(data.profile, data.planRow), plan: null };
  const a = d.answers;
  const step = d.step;
  const setA = (k, v) => setPlanDraft((x) => ({ ...(x || d), answers: { ...(x || d).answers, [k]: v } }));
  const setStep = (n) => { setPlanDraft((x) => ({ ...(x || d), step: n })); window.scrollTo(0, 0); };
  const [day, setDay] = React.useState(0);
  const body = derived.body;

  const exit = () => setTab("goal");
  const back = () => (step > 1 ? setStep(step - 1) : exit());

  const togglePain = (v) => {
    if (v === "none") return setA("pain", []);
    const cur = a.pain || [];
    setA("pain", cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]);
  };
  const toggleDay = (wd) => {
    const cur = a.train_days || [];
    setA("train_days", (cur.includes(wd) ? cur.filter((x) => x !== wd) : [...cur, wd]).sort((x, y) => x - y));
  };
  const nDays = (a.train_days || []).length;
  const split = splitFor(Math.max(2, nDays));

  const next = async () => {
    if (step === 1) return setStep(2);
    if (step === 2) {
      if (nDays < 2) return;
      const plan = generatePlan(a, data.logs);
      setPlanDraft((x) => ({ ...(x || d), step: 3, plan }));
      setDay(0);
      window.scrollTo(0, 0);
      return;
    }
    if (!d.plan) return;
    // Approve: save the answers to the profile and the plan.
    const age = coerceNumber(a.age), h = coerceNumber(a.height);
    await saveProfile({
      sex: a.sex || null, birth_year: age && age > 10 && age < 100 ? new Date().getFullYear() - Math.round(age) : data.profile?.birth_year ?? null,
      height_cm: h && h >= 100 && h <= 250 ? h : data.profile?.height_cm ?? null, activity: a.activity, experience: a.experience,
      train_days: a.train_days, session_min: a.session_min, equipment: a.equipment, focus: a.focus, pain: a.pain || [], cardio: a.cardio,
    });
    const { error } = await sb.insert("ev_plans", { user_id: user.id, answers: a, plan: d.plan, active: true });
    if (error) return;
    await refresh();
    setPlanDraft(null);
    setTab("train");
    window.scrollTo(0, 0);
    toast(t("approved"));
  };

  const plan = d.plan;
  const ws = useMemo(() => (plan ? weeklySets(plan) : null), [plan]);
  const rc = plan ? reviewCount(plan) : { kept: 0, total: 0 };
  const PD = plan?.days[Math.min(day, (plan?.days.length || 1) - 1)];
  const targets = derived.targets;
  const cardioTxt = { c2: t("cardioC2"), c3: t("cardioC3") }[plan?.cardio];

  return (
    <div className="app">
      <div className="topbar" style={{ justifyContent: "flex-start" }}>
        <button className="icon-btn" onClick={back} aria-label={t("back")}><Icon name="back" flip={rtl} /></button>
        <div className="grow">
          <div className="small strong muted">{t(`plStep${step}`)}</div>
          <div className="strong" style={{ fontSize: 19 }}>{t("plTitle")}</div>
        </div>
        <button className="pill-btn" onClick={() => changeTheme(theme === "light" ? "dark" : "light")} aria-label={theme === "light" ? t("toDark") : t("toLight")}><Icon name={theme === "light" ? "moon" : "sun"} size={17} /></button>
        <button className="pill-btn" onClick={() => changeLang(lang === "ar" ? "en" : "ar")} aria-label={t("langAria")}>{t("langBtn")}</button>
      </div>
      <div className="progress" style={{ padding: "0 16px 4px" }}>{[1, 2, 3].map((n) => <span key={n} className={n <= step ? "on" : ""} />)}</div>

      <main className="screen" style={{ paddingBottom: 16 }}>
        {step === 1 && (
          <>
            <div className="body sub">{t("pl1Intro")}</div>
            <Question label={t("sexQ")} hint={t("sexHint")}>
              <Chips options={[["m", t("male")], ["f", t("female")]]} value={a.sex} onChange={(v) => setA("sex", v)} />
            </Question>
            <div className="card tight">
              <div className="strong" style={{ fontSize: 14.5 }}>{t("plBody")}</div>
              <div className="grid2">
                <Field label={t("age")}><input className="input" inputMode="numeric" value={a.age} onChange={(e) => setA("age", e.target.value)} placeholder="34" /></Field>
                <Field label={t("height")}><input className="input" inputMode="decimal" value={a.height} onChange={(e) => setA("height", e.target.value)} placeholder="178" /></Field>
                <div className="box">
                  <div className="label">{t("weightKg")}</div>
                  <div className="num" style={{ fontSize: 22 }}>{body.weight != null ? fmtNum(body.weight, 1) : "—"}</div>
                  <div className="small" style={{ color: body.weight != null ? "var(--accent-text)" : "var(--muted)" }}>{body.weightDate ? t("fromWeigh", { date: fmtDate(body.weightDate, lang) }) : t("noWeighYet")}</div>
                </div>
                <div className="box">
                  <div className="label">{t("scanFat")}</div>
                  <div className="num" style={{ fontSize: 22 }}>{body.bodyFat != null ? fmtNum(body.bodyFat, 1) : "—"}</div>
                  <div className="small" style={{ color: body.scan ? "var(--accent-text)" : "var(--muted)" }}>{body.scan ? t("fromInbody", { date: fmtDate(body.scan.date, lang) }) : t("noScanYet")}</div>
                </div>
              </div>
            </div>
            <Question label={t("activityQ")} hint={t("activityHint")}>
              <Chips options={[["sit", t("actSit")], ["feet", t("actFeet")], ["job", t("actJob")]]} value={a.activity} onChange={(v) => setA("activity", v)} />
            </Question>
          </>
        )}

        {step === 2 && (
          <>
            <div className="body sub">{t("pl2Intro")}</div>
            <Question label={t("qExp")} hint={t("qExpHint")}>
              <Chips options={[["new", t("expNew")], ["mid", t("expMid")], ["adv", t("expAdv")]]} value={a.experience} onChange={(v) => setA("experience", v)} />
            </Question>
            <Question label={t("qDays")} hint={nDays >= 2 ? t("qDaysHint", { n: nDays, split: split.name[L] }) : t("qDaysMin")}>
              <Chips small multi options={WEEKDAYS.map((w, i) => [i, w[L]])} value={a.train_days} onChange={toggleDay} />
            </Question>
            <Question label={t("qMins")} hint={t("qMinsHint")}>
              <Chips options={[45, 60, 75, 90].map((m) => [m, `${m} ${t("min")}`])} value={a.session_min} onChange={(v) => setA("session_min", v)} />
            </Question>
            <Question label={t("qWhere")} hint={t("qWhereHint")}>
              <Chips options={[["gym", t("whereGym")], ["home", t("whereHome")], ["bw", t("whereBw")]]} value={a.equipment} onChange={(v) => setA("equipment", v)} />
            </Question>
            <Question label={t("qFocus")} hint={t("qFocusHint")}>
              <Chips options={[["muscle", t("focusMuscle")], ["strength", t("focusStrength")], ["mix", t("focusMix")]]} value={a.focus} onChange={(v) => setA("focus", v)} />
            </Question>
            <Question label={t("qPain")} hint={t("qPainHint")}>
              <Chips multi options={[["none", t("painNone")], ...PAIN.map((p) => [p, t(`pain${p[0].toUpperCase()}${p.slice(1)}`)])]}
                value={(a.pain || []).length ? a.pain : ["none"]} onChange={togglePain} />
            </Question>
            <Question label={t("qCardio")} hint={t("qCardioHint")}>
              <Chips options={[["none", t("cardioNone")], ["c2", t("cardioC2")], ["c3", t("cardioC3")]]} value={a.cardio} onChange={(v) => setA("cardio", v)} />
            </Question>
          </>
        )}

        {step === 3 && plan && (
          <>
            <div className="card accent">
              <div className="label">{t("plSplitLabel")}</div>
              <div className="strong" style={{ fontSize: 22, lineHeight: 1.2 }}>{plan.splitName[L]}</div>
              {ws && <div className="small sub">{t("plSplitWhy", { a: ws.min, b: ws.max })}</div>}
              <div className="grid3">
                {[[plan.days.length, t("stDays")], [plan.minutes, t("stMins")], [ws ? `${ws.min}–${ws.max}` : "—", t("stSets")]].map(([v, l]) => (
                  <div className="box" key={l} style={{ padding: "9px 10px" }}><div className="num" style={{ fontSize: 22, lineHeight: 1.1 }}>{v}</div><div className="muted strong" style={{ fontSize: 10.5, lineHeight: 1.3 }}>{l}</div></div>
                ))}
              </div>
              {targets?.kcal && <div className="small sub">{t("plFood", { k: fmtNum(targets.kcal), p: fmtNum(targets.protein) })}</div>}
              {cardioTxt && <div className="small sub">{t("cardioNote", { c: cardioTxt })}</div>}
            </div>
            <div className="day-tabs" role="tablist">
              {plan.days.map((pd, i) => (
                <button key={pd.key + i} className="day-tab" role="tab" aria-selected={i === day} onClick={() => setDay(i)}>
                  <span className="d">{WEEKDAYS[pd.weekday][L]}</span><span className="n">{pd.name[L]}</span>
                </button>
              ))}
            </div>
            <div className="row between" style={{ padding: "0 2px", alignItems: "baseline" }}>
              <span className="strong" style={{ fontSize: 14.5 }}>{WEEKDAYS_FULL[PD.weekday][L]} · {PD.name[L]}</span>
              <span className="small strong" style={{ color: "var(--accent-text)", whiteSpace: "nowrap" }}>{t("plReviewed", { k: rc.kept, n: rc.total })}</span>
            </div>
            {PD.slots.map((s) => {
              const ex = BY_ID[s.ex];
              if (!ex) return null;
              const em = musclesOf(ex);
              return (
                <div key={s.id} className="card tight" style={{ borderColor: s.kept ? "var(--accent-line)" : "var(--line)" }}>
                  <div className="row">
                    <button type="button" className="ex-media" onClick={() => openSheet("exInfo", { ex: s.ex })} aria-label={t("exInfoA11y", { name: ex.name[L] })}><Photo ex={ex} small /></button>
                    <div className="grow col" style={{ gap: 2 }}>
                      <span className="strong" style={{ fontSize: 14.5 }}>{ex.name[L]}</span>
                      <span className="small sub">{ex.gear[L]}</span>
                      <span className="small" style={{ color: "var(--accent-text)", fontWeight: 700 }}>{muscleNames(em.primary, lang).join(" · ")}</span>
                    </div>
                    <MuscleMap muscles={em} height={52} views="main" zoom group={ex.group} />
                  </div>
                  <div className="row between">
                    <span className="small sub">{t("plSets", { lo: s.reps[0], hi: s.reps[1] })}</span>
                    <Stepper small value={s.sets} min={1} max={12} onChange={(n) => setPlanDraft((x) => ({ ...x, plan: setSlotSets(x.plan, s.id, n) }))} label={`${t("setsThis")} · ${ex.name[L]}`} />
                  </div>
                  <div className="grid2">
                    <button className={`btn sm ${s.kept ? "soft" : ""}`} aria-pressed={!!s.kept} onClick={() => setPlanDraft((x) => ({ ...x, plan: toggleKept(x.plan, s.id) }))}>{s.kept ? t("kept") : t("keep")}</button>
                    <button className="btn sm" onClick={() => openSheet("swap", { src: "plan", slotId: s.id })} aria-label={`${t("swap")} ${ex.name[L]}`}><Icon name="swap" size={16} />{t("swap")}</button>
                  </div>
                </div>
              );
            })}
            <div className="small muted center">{t("plSwapHint")}</div>
          </>
        )}

        <div className="sticky-foot">
          <button className="btn primary lg glow" onClick={next} disabled={step === 2 && nDays < 2}>{t(`plNext${step}`)}</button>
          <span className="small muted center">{t(`plFoot${step}`)}</span>
        </div>
      </main>
    </div>
  );
}
