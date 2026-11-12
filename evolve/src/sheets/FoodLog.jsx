// Food log: the last 7 days in numbers, and a table of every day — calories,
// protein, burn and the difference from your target. Tap a day to see or fix it.
import React, { useMemo } from "react";
import { useApp } from "../ctx.js";
import { Icon } from "../ui.jsx";
import { fmtDate, fmtNum, signedIso } from "../lib/i18n.js";
import { localISO, liveAdjust } from "../lib/body.js";
import { dayRows, lastSeven } from "../lib/foodlog.js";

const sign = (n) => signedIso(n);

// Seven bars (one per day), each with that day's target as a dashed mark.
export function WeekBars({ week, height = 54 }) {
  const { lang } = useApp();
  const max = Math.max(0, ...week.rows.map((r) => Math.max(r.kcal, r.target || 0))) * 1.08 || 1;
  return (
    <div className="week-bars ltr" style={{ height: height + 16 }}>
      {week.rows.map((r) => (
        <div key={r.date} className="wb-col">
          {r.target ? <span className="wb-tick" style={{ bottom: 16 + (r.target / max) * height }} /> : null}
          <span className={`wb-bar${!r.logged ? " none" : r.target && r.kcal > r.target ? " over" : ""}`} style={{ height: r.logged ? Math.max(3, (r.kcal / max) * height) : 3 }} />
          <span className="wb-day">{new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en", { weekday: "narrow" }).format(new Date(`${r.date}T12:00:00`))}</span>
        </div>
      ))}
    </div>
  );
}

export function useWeekFood() {
  const { data, derived } = useApp();
  const today = localISO();
  return useMemo(() => lastSeven({ days: data.days, sessions: data.sessions, today, target: derived.targets?.kcal, proteinTarget: derived.targets?.protein, targetFor: derived.targetFor }),
    [data.days, data.sessions, today, derived]);
}

export default function FoodLog() {
  const { t, lang, data, derived, openSheet } = useApp();
  const today = localISO();
  const target = derived.targets?.kcal;
  const w = useWeekFood();
  const rows = useMemo(() => dayRows({ days: data.days, sessions: data.sessions, today, n: 30, target, targetFor: derived.targetFor }), [data.days, data.sessions, today, target, derived]);
  const open = (date) => openSheet("fuel", { date, backTo: { name: "foodlog" } });
  const stat = (v, l, color) => (
    <div className="box" style={{ padding: "9px 10px" }}>
      <div className="num" style={{ fontSize: 22, lineHeight: 1.15, color }}>{v}</div>
      <div className="small muted strong" style={{ fontSize: 11 }}>{l}</div>
    </div>
  );
  return (
    <>
      <div className="card tight" style={{ gap: 10 }}>
        <div className="row between">
          <span className="card-title">{t("flWeek")}</span>
          <span className="small muted">{fmtDate(w.from, lang)} – {fmtDate(w.to, lang)}</span>
        </div>
        {w.logged ? (
          <>
            <div className="grid3">
              {stat(fmtNum(w.total), t("flTotal"))}
              {stat(fmtNum(w.avg), t("flAvg"))}
              {stat(w.vsTarget != null ? fmtNum(Math.abs(w.vsTarget)) : "—", t(w.vsTarget > 0 ? "flOverDay" : "flUnderDay"), w.vsTarget > 100 ? "var(--warn)" : w.vsTarget != null ? "var(--ok)" : undefined)}
            </div>
            <WeekBars week={w} />
            <div className="small sub">{t("flLogged", { n: w.logged })}{w.protein != null ? ` · ${t("flProtein", { p: fmtNum(w.protein), t: w.proteinTarget ? fmtNum(w.proteinTarget) : "—" })}` : ""}</div>
            {w.balance != null && (
              <div className="small strong" style={{ color: w.balance < 0 ? "var(--ok)" : "var(--warn)" }}>
                {t(w.balance < 0 ? "flDeficit" : "flSurplus", { b: fmtNum(w.burn), d: fmtNum(Math.abs(w.balance)), k: fmtNum(Math.abs(w.kgPerWeek), 2) })}
              </div>
            )}
          </>
        ) : <div className="small sub">{t("flNone")}</div>}
      </div>

      <div className="fl-table" role="table" aria-label={t("flTable")}>
        <div className="fl-row head" role="row">
          <span role="columnheader">{t("flDay")}</span><span role="columnheader">{t("kcal")}</span><span role="columnheader">{t("flPro")}</span>
          <span role="columnheader">{t("flBurn")}</span><span role="columnheader">{t("flDiff")}</span>
        </div>
        {rows.map((r) => (
          <button key={r.date} type="button" role="row" className={`fl-row${r.today ? " today" : ""}${r.logged ? "" : " empty"}`} onClick={() => open(r.date)}
            aria-label={`${fmtDate(r.date, lang, "day")}: ${r.logged ? `${fmtNum(r.kcal)} ${t("kcal")}` : t("flNotLogged")}`}>
            <span role="cell" className="d"><span className="d1">{r.today ? t("today") : fmtDate(r.date, lang)}</span><span className="d2">{fmtDate(r.date, lang, "wday")}</span></span>
            <span role="cell" className="num">{r.logged ? fmtNum(r.kcal) : "—"}</span>
            <span role="cell">{r.protein ? fmtNum(r.protein) : "—"}</span>
            <span role="cell" className="muted">{r.burn ? fmtNum(r.burn) : "—"}</span>
            <span role="cell" className="strong" style={{ color: r.diff == null ? "var(--faint)" : r.today ? "var(--sub)" : r.diff > 100 ? "var(--warn)" : "var(--ok)" }}>{r.diff == null ? (r.logged ? "" : <Icon name="plus" size={14} />) : sign(r.diff)}</span>
          </button>
        ))}
      </div>
      <div className="small muted">{rows.some((r) => r.live) && liveAdjust(derived.targets)
        ? t("flHintBurn", { a: signedIso(liveAdjust(derived.targets)), k: target ? fmtNum(target) : "—" })
        : t("flHint", { k: target ? fmtNum(target) : "—" })}</div>
    </>
  );
}
