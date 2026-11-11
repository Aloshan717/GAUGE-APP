// After "Finish workout": how it went — time, sets, weight moved, records, and
// the change from the last time you trained the same muscles.
import React from "react";
import { useApp } from "../ctx.js";
import { Icon } from "../ui.jsx";
import { fmtDate, fmtNum } from "../lib/i18n.js";
import { MUSCLE_NAMES } from "../lib/exercises.js";

export default function Summary({ ctx }) {
  const { t, lang, closeSheet, trainSession } = useApp();
  const s = ctx.summary || trainSession?.summary;
  if (!s) return <div className="small muted">{t("noSets")}</div>;
  const L = lang === "ar" ? 1 : 0;
  const change = s.lastVolume > 0 && s.volume > 0 ? Math.round(((s.volume - s.lastVolume) / s.lastVolume) * 100) : null;
  const stat = (v, l) => (
    <div className="box" style={{ padding: "10px 12px" }}>
      <div className="num" style={{ fontSize: 26, lineHeight: 1.1 }}>{v}</div>
      <div className="small muted strong">{l}</div>
    </div>
  );
  return (
    <>
      <div className="col" style={{ gap: 2 }}>
        <div className="strong" style={{ fontSize: 18 }}>{t("sumWell")}</div>
        <div className="small sub">{fmtDate(s.date, lang, "weekday")} · {s.muscles.map((m) => (MUSCLE_NAMES[m] || [m, m])[L]).join(" + ")}</div>
      </div>
      <div className="grid2">
        {stat(fmtNum(s.minutes), t("sumMin"))}
        {stat(fmtNum(s.exercises), t("sumEx"))}
        {stat(fmtNum(s.sets), t("sumSets"))}
        {stat(`${fmtNum(s.volume)}`, t("sumVolume"))}
      </div>
      {change != null && (
        <div className={`note ${change >= 0 ? "" : "plain"}`}>
          <Icon name={change >= 0 ? "bolt" : "info"} size={16} color={change >= 0 ? "var(--accent)" : "var(--muted)"} />
          <span>{t(change >= 0 ? "sumMore" : "sumLess", { p: Math.abs(change), date: fmtDate(s.lastDate, lang) })}</span>
        </div>
      )}
      <div className="label">{t("sumRecords")}</div>
      {s.records?.length ? s.records.map((r, i) => (
        <div key={i} className="row between" style={{ padding: "8px 12px", borderRadius: 12, background: "var(--accent-soft)", border: "1px solid var(--accent-line)" }}>
          <span className="strong">🏆 {Array.isArray(r.name) ? r.name[L] : r.name}</span>
          <span className="small strong ltr" style={{ color: "var(--accent-text)" }}>{r.kg > 0 ? `${fmtNum(r.kg, 2)} × ${r.reps}` : `${r.reps} ${t("repsWord")}`}</span>
        </div>
      )) : <div className="small muted">{t("sumNoRecords")}</div>}
      <button className="btn primary lg" onClick={closeSheet}>{t("done")}</button>
    </>
  );
}
