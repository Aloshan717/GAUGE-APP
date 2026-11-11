// The weekly report: last week at a glance, and the calorie check-in.
import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../ctx.js";
import { Icon, Note } from "../ui.jsx";
import { store } from "../lib/api.js";
import { fmtDate, fmtNum, signed } from "../lib/i18n.js";
import { localISO, addDays } from "../lib/body.js";
import { reportWeek, weeklyReport, MIN_LOGGED } from "../lib/weekly.js";
import { lastPhotoDate } from "../lib/photos.js";

export const seenKey = (uid) => `evolve_week_seen_${uid}`;
export const weekRange = (r, lang) => `${fmtDate(r.from, lang)} – ${fmtDate(r.to, lang)}`;

export function useWeekly(week) {
  const { data, derived } = useApp();
  return useMemo(() => weeklyReport({ week, data, profile: data.profile || {}, body: derived.body, current: derived.targets?.kcal, protein: derived.targets?.protein }),
    [week.key, data, derived]);   // eslint-disable-line react-hooks/exhaustive-deps
}

function Section({ icon, title, children }) {
  return (
    <div className="wk-sec">
      <div className="row" style={{ gap: 8 }}><Icon name={icon} size={17} color="var(--accent)" /><span className="strong">{title}</span></div>
      <div className="col" style={{ gap: 4 }}>{children}</div>
    </div>
  );
}

export default function Weekly({ ctx }) {
  const { t, lang, user, derived, setKcalLock, kcalLock, closeSheet, toast, setTab } = useApp();
  const week = ctx.week || reportWeek(localISO());
  const r = useWeekly(week);
  const L = lang === "ar" ? 1 : 0;
  const [photoDate, setPhotoDate] = useState(undefined);
  useEffect(() => { lastPhotoDate(user.id).then(setPhotoDate); }, [user.id]);
  const photosDue = photoDate !== undefined && (!photoDate || photoDate < addDays(localISO(), -14));
  const seen = () => store.set(seenKey(user.id), week.key);
  const ci = r.checkin;

  const apply = () => {
    setKcalLock({ ...(kcalLock || {}), kcal: ci.suggested, goalKey: derived.goalKey, since: localISO(), week: week.key });
    seen(); toast(t("ciApplied", { k: fmtNum(ci.suggested) })); closeSheet();
  };
  const keep = () => { seen(); closeSheet(); };
  const goPhotos = () => { seen(); store.set("evolve_body_seg", "photos"); closeSheet(); setTab("body"); window.scrollTo(0, 0); };

  const w = r.weight;
  return (
    <>
      <div className="small sub">{weekRange(r, lang)}</div>

      <Section icon="scale" title={t("wkWeight")}>
        {w.end && w.start ? (
          <>
            <span className="body"><b className="ltr">{fmtNum(w.start.weight, 1)} → {fmtNum(w.end.weight, 1)} {t("kg")}</b>{" "}
              <span style={{ color: w.delta < 0 ? "var(--ok)" : w.delta > 0 ? "var(--warn)" : "var(--sub)", fontWeight: 800 }}>({signed(w.delta)} {t("kg")})</span></span>
            <span className="small muted">{t("wkBetween", { a: fmtDate(w.start.date, lang), b: fmtDate(w.end.date, lang) })}</span>
          </>
        ) : w.end && w.end.date >= r.from ? (
          <span className="small sub">{t("wkOneWeigh", { v: fmtNum(w.end.weight, 1), date: fmtDate(w.end.date, lang) })}</span>
        ) : <span className="small sub">{t("wkNoWeigh")}</span>}
      </Section>

      <Section icon="flame" title={t("wkFood")}>
        {r.food.days ? (
          <>
            <span className="body">{t("wkLogged", { n: r.food.days })}</span>
            <span className="small sub">{t("wkAvgKcal", { k: fmtNum(r.food.kcal), tk: r.food.target ? fmtNum(r.food.target) : "—" })}</span>
            <span className="small sub">{t("wkAvgPro", { p: fmtNum(r.food.protein), tp: r.food.proteinTarget ? fmtNum(r.food.proteinTarget) : "—" })}</span>
          </>
        ) : <span className="small sub">{t("wkNoFood")}</span>}
        {r.burn && <span className="small muted">{t("wkBurn", { k: fmtNum(r.burn.avg), n: r.burn.days })}</span>}
      </Section>

      <Section icon="train" title={t("wkTraining")}>
        {r.training.sets ? <span className="body">{t("wkWorkouts", { w: r.training.workouts, s: r.training.sets })}</span> : <span className="small sub">{t("wkNoTraining")}</span>}
        {r.training.records.map((x) => (
          <span key={x.id} className="small strong" style={{ color: "var(--accent-text)" }}>🏆 {x.name?.[L] || x.id} <span className="ltr">{fmtNum(x.kg, 2)} × {x.reps}</span></span>
        ))}
      </Section>

      {r.inbody && (
        <Section icon="body" title={t("wkInbody", { date: fmtDate(r.inbody.date, lang) })}>
          <span className="small sub">
            {r.inbody.fatDelta != null ? t("wkFat", { d: signed(r.inbody.fatDelta) }) : `${fmtNum(r.inbody.fat, 1)}%`}
            {r.inbody.muscleDelta != null ? ` · ${t("wkMuscle", { d: signed(r.inbody.muscleDelta) })}` : ""}
          </span>
        </Section>
      )}

      {photosDue && (
        <div className="note plain" style={{ alignItems: "center" }}>
          <Icon name="camera" size={16} color="var(--muted)" />
          <span className="grow">{t("wkPhotos")}</span>
          <button className="link" style={{ minHeight: 0, padding: 0 }} onClick={goPhotos}>{t("wkPhotosGo")}</button>
        </div>
      )}

      <div className="card tight checkin">
        <div className="row" style={{ gap: 8 }}><Icon name="goal" size={18} color="var(--accent)" /><span className="card-title">{t("ciTitle")}</span></div>
        {ci.status === "adjust" || ci.status === "ok" ? (
          <>
            <div className="body">{t("ciBurn", { b: fmtNum(ci.burn), i: fmtNum(ci.avgIn), w: signed(ci.kgPerWeek, 2) })}</div>
            {r.food.days > 0 && r.food.kcal - ci.current > 150 && <Note kind="warn" icon="info">{t("ciOver", { d: fmtNum(Math.round(r.food.kcal - ci.current)) })}</Note>}
            {r.food.days > 0 && ci.current - r.food.kcal > 300 && <Note kind="warn" icon="info">{t("ciUnder", { d: fmtNum(Math.round(ci.current - r.food.kcal)) })}</Note>}
            {ci.status === "adjust" ? (
              <>
                <div className="ci-change">
                  <span className="num ltr">{fmtNum(ci.current)}</span><span className="muted"> → </span><span className="num ltr" style={{ color: "var(--accent-text)" }}>{fmtNum(ci.suggested)}</span>
                  <span className="small muted"> {t("kcal")} ({ci.change > 0 ? "+" : "−"}{fmtNum(Math.abs(ci.change))})</span>
                </div>
                <div className="small sub">{t(ci.change < 0 ? "ciWhyDown" : "ciWhyUp", { g: ci.goalPerWeek != null ? signed(ci.goalPerWeek, 2) : "—" })}</div>
                <button className="btn primary" onClick={apply}>{t("ciApply", { k: fmtNum(ci.suggested) })}</button>
                <button className="btn ghost" onClick={keep}>{t("ciKeep", { k: fmtNum(ci.current) })}</button>
              </>
            ) : (
              <>
                <Note>{t("ciOk", { k: fmtNum(ci.current) })}</Note>
                <button className="btn primary" onClick={keep}>{t("done")}</button>
              </>
            )}
          </>
        ) : (
          <>
            <div className="small sub">
              {ci.status === "need-food" ? t("ciNeedFood", { n: ci.logged, m: MIN_LOGGED })
                : ci.status === "need-weight" ? t("ciNeedWeight")
                : ci.status === "early" ? t("ciEarly")
                : t("ciNoGoal")}
            </div>
            <button className="btn primary" onClick={keep}>{t("done")}</button>
          </>
        )}
        <div className="small muted">{t("ciRules")}</div>
      </div>
    </>
  );
}
