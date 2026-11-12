// Earlier weekly reports: one line per week (Sunday → Saturday); tap to open it.
import React, { useMemo } from "react";
import { useApp } from "../ctx.js";
import { Icon } from "../ui.jsx";
import { fmtNum, signed } from "../lib/i18n.js";
import { localISO } from "../lib/body.js";
import { pastWeeks, weeklyReport, hasContent } from "../lib/weekly.js";
import { useResting } from "../hooks.js";
import { weekRange } from "./Weekly.jsx";

export default function Weeks() {
  const { t, lang, rtl, data, derived, openSheet } = useApp();
  const resting = useResting();
  const list = useMemo(() => pastWeeks(localISO(), 16).map((week) => ({
    week,
    r: weeklyReport({ week, data, profile: data.profile || {}, body: derived.body, current: derived.targets?.kcal, protein: derived.targets?.protein, resting }),
  })), [data, derived, resting]);
  const shown = list.filter((x, i) => i === 0 || hasContent(x.r));
  return (
    <>
      <div className="small sub">{t("wksIntro")}</div>
      {shown.map(({ week, r }, i) => (
        <button key={week.key} type="button" className="card tight rp-week" onClick={() => openSheet("weekly", { week })}>
          <span className="grow col" style={{ gap: 3, alignItems: "flex-start", textAlign: "start" }}>
            <span className="row" style={{ gap: 8 }}>
              <span className="strong">{weekRange(r, lang)}</span>
              {i === 0 && <span className="tag ok" style={{ fontSize: 10.5, padding: "1px 6px" }}>{t("rpLatest")}</span>}
            </span>
            <span className="small sub">
              {[t("wksDays", { n: r.training.workouts }), r.training.volume ? t("wksVolume", { v: fmtNum(r.training.volume) }) : null,
                r.food.days ? t("wksKcal", { k: fmtNum(r.food.kcal) }) : null, r.weight.end && r.weight.start ? `${signed(r.weight.delta)} ${t("kg")}` : null].filter(Boolean).join(" · ")}
            </span>
          </span>
          <Icon name="next" size={18} flip={rtl} color="var(--muted)" />
        </button>
      ))}
      {shown.length <= 1 && <div className="small muted center">{t("wksEmpty")}</div>}
    </>
  );
}
