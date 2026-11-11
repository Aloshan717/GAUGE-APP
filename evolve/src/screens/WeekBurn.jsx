// Train: what you burned this week from your watch — only the active calories
// (the Move ring), Sunday to now. Tap a day to see it or type it in.
import React, { useMemo } from "react";
import { useApp } from "../ctx.js";
import { Icon } from "../ui.jsx";
import { fmtDate, fmtNum } from "../lib/i18n.js";
import { localISO, addDays } from "../lib/body.js";
import { burnWeek, linkResting } from "../lib/burnweek.js";

const H = 44;   // tallest bar, px

export default function WeekBurn() {
  const { t, lang, data, derived, user, openSheet } = useApp();
  const today = localISO();
  const resting = linkResting(user?.id) || derived.maint?.bmr?.kcal || null;
  const w = useMemo(() => burnWeek({ days: data.days, sessions: data.sessions, today, resting }), [data.days, data.sessions, today, resting]);
  if (!w) return null;
  const lastWatch = (data.days || []).filter((d) => d.burn_source === "watch" && d.burn_kcal).map((d) => String(d.date).slice(0, 10)).sort().pop();
  const stale = !lastWatch || lastWatch < addDays(today, -1);
  const max = Math.max(1, ...w.rows.map((r) => r.active || 0));
  const letter = (iso) => new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en", { weekday: "narrow" }).format(new Date(`${iso}T12:00:00`));
  const line = [w.avg != null && t("bwAvg", { k: fmtNum(w.avg) }), w.today != null && t("bwToday", { k: fmtNum(w.today) })].filter(Boolean).join(" · ");

  return (
    <div className="card tight bw" style={{ gap: 8 }}>
      <div className="row between">
        <span className="row" style={{ gap: 7 }}><Icon name="flame" size={18} color="var(--fat)" /><span className="card-title">{t("bwTitle")}</span></span>
        <span className="small muted">{t("bwRange", { d: fmtDate(w.from, lang) })}</span>
      </div>
      <div className="row" style={{ alignItems: "baseline", gap: 6 }}>
        <span className="num" style={{ fontSize: 30, lineHeight: 1.1 }}>{fmtNum(w.total)}</span>
        <span className="small strong" style={{ color: "var(--fat)" }}>{t("bwUnit")}</span>
      </div>
      <div className="week-bars ltr bw-bars" style={{ height: H + 30 }}>
        {w.rows.map((r) => (
          <button key={r.date} type="button" className={`wb-col${r.today ? " now" : ""}`} disabled={r.future} onClick={() => openSheet("burn", { date: r.date })}
            aria-label={`${fmtDate(r.date, lang, "day")}: ${r.active != null ? t("bwDayA11y", { k: fmtNum(r.active) }) : t("bwNoData")}`}>
            <span className="bw-v">{r.active != null ? fmtNum(r.active) : r.future ? "" : "—"}</span>
            <span className={`wb-bar bw${r.active == null ? " none" : ""}${r.future ? " future" : ""}`} style={{ height: r.active != null ? Math.max(3, (r.active / max) * H) : 3 }} />
            <span className="wb-day">{letter(r.date)}</span>
          </button>
        ))}
      </div>
      {line && <div className="small sub">{line}</div>}
      {stale && (
        <div className="row between" style={{ gap: 10 }}>
          <span className="small" style={{ color: "var(--warn)" }}>{lastWatch ? t("bwStale", { date: fmtDate(lastWatch, lang) }) : t("bwNone")}</span>
          <button type="button" className="link" style={{ flex: "none" }} onClick={() => openSheet("sync")}>{t(lastWatch ? "bwFix" : "bwSetup")}</button>
        </div>
      )}
      <div className="small muted">{t("bwNote")}</div>
    </div>
  );
}
