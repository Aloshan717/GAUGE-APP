// Your extra burn from the watch — only the active calories (the Move ring),
// no resting energy: this week so far (Sunday to now, back to zero every
// Sunday) and last week's daily average. Tap a day to see it or type it in.
// On Home it sits in the fuel card (compact); on Train it is its own card.
import React, { useMemo } from "react";
import { useApp } from "../ctx.js";
import { Icon } from "../ui.jsx";
import { fmtDate, fmtNum } from "../lib/i18n.js";
import { localISO, addDays } from "../lib/body.js";
import { burnWeek, linkResting } from "../lib/burnweek.js";

// The resting energy taken out of each day: the one inside your Shortcut link.
export function useResting() {
  const { derived, user } = useApp();
  return linkResting(user?.id) || derived.maint?.bmr?.kcal || null;
}

export default function WeekBurn({ compact = false }) {
  const { t, lang, data, openSheet } = useApp();
  const today = localISO();
  const resting = useResting();
  const w = useMemo(() => burnWeek({ days: data.days, sessions: data.sessions, today, resting }), [data.days, data.sessions, today, resting]);
  if (!w) return null;
  const lastWatch = (data.days || []).filter((d) => d.burn_source === "watch" && d.burn_kcal).map((d) => String(d.date).slice(0, 10)).sort().pop();
  const stale = !lastWatch || lastWatch < addDays(today, -1);
  const H = compact ? 34 : 44;
  const max = Math.max(1, ...w.rows.map((r) => r.active || 0));
  const letter = (iso) => new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en", { weekday: "narrow" }).format(new Date(`${iso}T12:00:00`));
  const line = [w.today != null && t("bwToday", { k: fmtNum(w.today) }), w.avg != null && t("bwAvg", { k: fmtNum(w.avg) })].filter(Boolean).join(" · ");
  const stat = (v, label, color) => (
    <div className="box" style={{ padding: "8px 10px" }}>
      <div className="num" style={{ fontSize: compact ? 22 : 26, lineHeight: 1.15, color }}>{v}</div>
      <div className="small muted strong" style={{ fontSize: 11 }}>{label}</div>
    </div>
  );

  return (
    <div className={compact ? "fl-week bw" : "card tight bw"} style={{ gap: 8 }}>
      <div className="row between" style={{ width: "100%" }}>
        <span className="row" style={{ gap: 7 }}><Icon name="flame" size={compact ? 16 : 18} color="var(--fat)" /><span className={compact ? "small strong sub" : "card-title"}>{t("bwTitle")}</span></span>
        <span className="small muted">{t("bwRange", { d: fmtDate(w.from, lang) })}</span>
      </div>
      <div className="grid2">
        {stat(fmtNum(w.total), t("bwThisWeek"), "var(--fat)")}
        {stat(w.last.avg != null ? fmtNum(w.last.avg) : "—", t("bwLastAvg"))}
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
        <div className="row between" style={{ gap: 10, width: "100%" }}>
          <span className="small" style={{ color: "var(--warn)" }}>{lastWatch ? t("bwStale", { date: fmtDate(lastWatch, lang) }) : t("bwNone")}</span>
          <button type="button" className="link" style={{ flex: "none" }} onClick={() => openSheet("sync")}>{t(lastWatch ? "bwFix" : "bwSetup")}</button>
        </div>
      )}
      <div className="small muted">{t(compact ? "bwNoteShort" : "bwNote")}</div>
    </div>
  );
}
