// Home: progress vs time for weight, body fat and Muscle Mass; today's fuel; trends.
import React from "react";
import { useApp } from "../ctx.js";
import { Icon, Ring, Spark, Bar } from "../ui.jsx";
import { fmtDate, fmtNum, signed, signedIso, joinList } from "../lib/i18n.js";
import { localISO, addDays, dayRow, burnByDate, arrival, changeOver } from "../lib/body.js";
import { coerceNumber } from "../lib/core.js";
import { MealChips } from "../sheets/Sheets.jsx";
import { store } from "../lib/api.js";
import { reportWeek, hasContent } from "../lib/weekly.js";
import { useWeekly, seenKey, weekRange } from "../sheets/Weekly.jsx";
import { WeekBars, useWeekFood } from "../sheets/FoodLog.jsx";

const COLOR = { weight: "var(--accent)", bodyFat: "var(--fat)", muscle: "var(--muscle)" };
const STATUS_COLOR = { ok: "var(--ok)", warn: "var(--warn)", bad: "var(--bad)", neutral: "var(--accent)" };
// Traffic light for a goal's progress, judged against the time gone: green on
// pace, yellow a bit behind, red behind (or the wrong way). The first fortnight
// is too early to call anyone behind, so there it stops at yellow.
const paceColor = (p) => {
  if (!p) return null;
  if (p.color !== "neutral") return p.color;
  return !p.elapsed || p.progress / p.elapsed >= 0.95 ? "ok" : "warn";
};
const BUCKET = { "On track": "ok", "Target reached": "done", "Slightly behind": "warn", Behind: "bad", "Wrong direction": "bad", "Date passed": "bad", "Just started": "early" };
const LABEL = { weight: "mWeight", bodyFat: "mFat", muscle: "mMuscle" };
const DAY = 86400000;

// Change since the reading before the latest one; green when it moves toward the goal.
function sinceLast(tr) {
  const pts = tr?.points || [];
  if (tr?.curr == null || tr?.prev == null || pts.length < 2) return null;
  const d = Math.round((tr.curr - tr.prev) * 10) / 10;
  const dir = Math.sign(tr.direction || 0);
  const color = d === 0 || !dir ? "var(--sub)" : Math.sign(d) === dir ? "var(--ok)" : "var(--bad)";
  return { d, date: pts[pts.length - 2].date, color };
}

export default function Home({ name }) {
  const { t, lang, data, derived, openSheet, setTab, user, sheet } = useApp();
  const { tracks, targets } = derived;
  const goal = data.goal;
  const hour = new Date().getHours();
  const greet = name ? t(hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening", { name }) : t("hello");
  const keys = ["weight", "bodyFat", "muscle"];
  const unitOf = (k) => (k === "bodyFat" ? "%" : t("kg"));

  // ── Weekly report (until you've opened it) ──
  const week = reportWeek(localISO());
  const wr = useWeekly(week);
  const food7 = useWeekFood();
  const unseen = !!user?.id && store.get(seenKey(user.id)) !== week.key && !sheet;
  const weeklyCard = unseen && hasContent(wr) ? (
    <div className="card accent">
      <div className="row between"><span className="card-title">{t("wkTitle")}</span><span className="small muted">{weekRange(wr, lang)}</span></div>
      <div className="wk-stats">
        <div><div className="num ltr">{wr.weight.delta != null ? signed(wr.weight.delta) : "—"}</div><div className="small muted strong">{t("wkKgShort")}</div></div>
        <div><div className="num">{wr.food.days ? fmtNum(wr.food.kcal) : "—"}</div><div className="small muted strong">{t("wkAvgShort")}</div></div>
        <div><div className="num">{wr.training.workouts}</div><div className="small muted strong">{t("wkWorkoutsShort")}</div></div>
      </div>
      {wr.checkin.status === "adjust" && <div className="small strong" style={{ color: "var(--accent-text)" }}>{t("wkCiHint", { k: fmtNum(wr.checkin.suggested) })}</div>}
      <button className="btn primary" onClick={() => openSheet("weekly", { week })}>{t("wkOpen")}</button>
    </div>
  ) : null;

  // ── Goal card ──
  let goalCard;
  if (!goal) {
    goalCard = (
      <div className="card accent">
        <div className="row"><Icon name="goal" color="var(--accent)" /><span className="card-title">{t("noGoalTitle")}</span></div>
        <div className="body sub">{t("noGoalText")}</div>
        <button className="btn primary" onClick={() => setTab("goal")}>{t("setGoal")}</button>
      </div>
    );
  } else {
    const daysLeft = goal.target_date ? Math.ceil((new Date(goal.target_date + "T00:00:00") - Date.now()) / DAY) : null;
    const dirName = { lose: "goalLose", gain: "goalGain", recomp: "goalRecomp", maintain: "goalMaintain" }[targets?.direction || "maintain"];
    const buckets = { ok: [], done: [], warn: [], bad: [], early: [] };
    keys.forEach((k) => { const p = tracks[k]?.pace; if (p) buckets[BUCKET[p.status] || "early"].push(t(LABEL[k])); });
    const summary = [["done", "sumDone"], ["ok", "sumOk"], ["warn", "sumWarn"], ["bad", "sumBad"], ["early", "sumEarly"]]
      .filter(([b]) => buckets[b].length).map(([b, key]) => t(key, { list: joinList(buckets[b], t) })).join(" ");

    // When will all targets be reached at today's pace?
    const arr = keys.filter((k) => tracks[k]?.target != null && tracks[k]?.curr != null).map((k) => arrival(tracks[k]));
    let eta = t("etaUnknown");
    if (arr.length && arr.every((a) => a && (a.reached || a.date))) {
      const dates = arr.filter((a) => !a.reached).map((a) => a.date).sort();
      if (dates.length && goal.target_date) {
        const last = dates[dates.length - 1];
        const diff = Math.round((new Date(last) - new Date(goal.target_date)) / DAY);
        const when = Math.abs(diff) <= 3 ? t("etaOnTime") : diff > 0 ? t("etaLate", { n: diff }) : t("etaEarly", { n: -diff });
        eta = t("etaAll", { date: fmtDate(last, lang), when });
      } else if (!dates.length) eta = "";
    }

    goalCard = (
      <div className="card">
        <div className="row between">
          <span className="small strong sub">{t(dirName)}</span>
          {daysLeft != null && <span className={`tag ${daysLeft < 0 ? "bad" : "ok"}`}>{daysLeft < 0 ? t("datePassed") : daysLeft === 1 ? t("oneDayLeft") : t("daysLeft", { n: daysLeft })}</span>}
        </div>
        <div className="rings">
          {keys.map((k) => {
            const tr = tracks[k];
            const p = tr?.pace;
            const has = tr?.curr != null;
            const ch = sinceLast(tr);
            return (
              <div className="ring-col" key={k}>
                <Ring value={has ? fmtNum(tr.curr, 1) : "—"} unit={unitOf(k)} progress={p?.progress} color={STATUS_COLOR[paceColor(p)] || "var(--surface3)"} />
                {ch && (
                  <span className="ring-delta" style={{ color: ch.color }}>
                    <b>{ch.d === 0 ? "=" : ch.d < 0 ? "▼" : "▲"} {fmtNum(Math.abs(ch.d), 1)}{k === "bodyFat" ? "%" : ` ${unitOf(k)}`}</b>
                    <span className="muted">{t("vsLast", { date: fmtDate(ch.date, lang) })}</span>
                  </span>
                )}
                <span className="row small strong" style={{ gap: 5, color: "var(--text2)", whiteSpace: "nowrap" }}><span className="dot" style={{ background: COLOR[k] }} />{t(LABEL[k])}</span>
                {p ? (
                  <span className="strong" style={{ color: STATUS_COLOR[paceColor(p)], fontSize: 15 }}>{Math.round(p.progress)}%</span>
                ) : <span className="small muted">{has ? "—" : t("noReading")}</span>}
                {tr?.target != null && <span className="muted" style={{ fontSize: 11 }}><span aria-hidden="true">{lang === "ar" ? "←" : "→"}</span> {fmtNum(tr.target, 1)} {unitOf(k)}</span>}
              </div>
            );
          })}
        </div>
        {(summary || eta) && (
          <div className="box col" style={{ gap: 6 }}>
            {summary && <div className="body">{summary}</div>}
            {eta && <div className="small sub">{eta}</div>}
          </div>
        )}
      </div>
    );
  }

  // ── Fuel card ──
  const today = localISO();
  const row = dayRow(data.days, today) || {};
  const burns = burnByDate(data.days, data.sessions);
  const yesterday = addDays(today, -1);
  const burnToday = burns.get(today), burnYest = burns.get(yesterday);
  const lastWatch = (data.days || []).filter((d) => d.burn_source === "watch" && d.burn_kcal).map((d) => d.date).sort().pop();
  const kIn = coerceNumber(row.kcal_in) || 0, pIn = coerceNumber(row.protein_g) || 0;
  // The big number is what's left (or over); what you ate of the target sits under the bar.
  const fuelRow = (label, eaten, target, unit, color, isCal) => {
    const pct = target ? (eaten / target) * 100 : 0;
    const diff = target ? Math.round(target - eaten) : null;
    const warn = diff != null && diff < 0 && isCal;
    const tone = warn ? "var(--warn)" : color;
    // Put the number big inside its own sentence ("80 kcal left" / "باقي 80 سعرة").
    const big = (key, n) => {
      const [before, after] = t(key, { n: "\u0000", u: unit }).split("\u0000");
      return <span className="small strong" style={{ color: tone }}>{before}<span className="num" style={{ fontSize: 24, color: warn ? "var(--warn)" : "var(--text)" }}>{fmtNum(n)}</span>{after}</span>;
    };
    return (
      <div className="col" style={{ gap: 6 }}>
        <div className="row between" style={{ alignItems: "baseline" }}>
          <span className="small strong sub">{label}</span>
          {diff == null
            ? <span className="small muted"><span className="num" style={{ fontSize: 24, color: "var(--text)" }}>{fmtNum(eaten)}</span> {unit}</span>
            : diff > 0 ? big("left", diff) : diff === 0 ? <span className="small strong" style={{ color: tone }}>{t("reachedFuel")}</span> : big("over", -diff)}
        </div>
        <Bar pct={pct} color={tone} />
        {target ? <span className="small muted">{t("eatenOf", { n: fmtNum(eaten), t: fmtNum(target), u: unit })}</span> : null}
      </div>
    );
  };

  const fuelCard = (
    <div className="card">
      <div className="row between">
        <span className="card-title">{t("fuelTitle")}</span>
        <span className="row small muted" style={{ gap: 5 }}>
          {!lastWatch ? t("notSynced")
            : lastWatch < yesterday
              ? <button className="link" style={{ padding: 0, minHeight: 0, color: "var(--warn)", fontSize: "inherit" }} onClick={() => openSheet("sync")}><Icon name="info" size={14} color="var(--warn)" /> {t("syncedStale", { date: fmtDate(lastWatch, lang) })}</button>
              : <><Icon name="check" size={14} stroke={2.4} color="var(--accent)" />{t("synced", { date: fmtDate(lastWatch, lang) })}</>}
        </span>
      </div>
      {fuelRow(t("calLabel"), kIn, targets?.kcal, t("kcal"), "var(--ok)", true)}
      {fuelRow(t("proLabel"), pIn, targets?.protein, t("g"), "var(--muscle)", false)}
      {!goal && <div className="small muted">{t("noTargets")}</div>}
      {goal && targets && !targets.kcal && (
        <div className="note warn"><Icon name="info" size={16} color="var(--warn)" /><span>{t("needProfile")} <button className="link" style={{ padding: 0, minHeight: 0 }} onClick={() => openSheet("profile")}>{t("addProfile")}</button></span></div>
      )}
      <button className="row between box" style={{ border: "none", width: "100%", color: "inherit", textAlign: "start" }} onClick={() => openSheet("burn")}>
        <span className="row small sub" style={{ gap: 8 }}><Icon name="flame" size={18} color="var(--fat)" />{burnToday ? t("burnToday") : burnYest ? t("burnYesterday") : t("noBurn")}</span>
        {(burnToday || burnYest) && <span className="num" style={{ fontSize: 20 }}>{fmtNum(burnToday || burnYest)} <span className="small muted" style={{ fontFamily: "inherit" }}>{t("kcal")}</span></span>}
      </button>
      {food7.logged > 0 && (
        <button type="button" className="fl-week" onClick={() => openSheet("foodlog")} aria-label={t("flOpen")}>
          <span className="row between" style={{ width: "100%" }}>
            <span className="small strong sub">{t("flWeekShort")}</span>
            <span className="small strong">{t("flAvgLine", { k: fmtNum(food7.avg), n: food7.logged })}</span>
          </span>
          <WeekBars week={food7} height={38} />
          <span className="small muted" style={{ width: "100%" }}>{t("flTotalLine", { k: fmtNum(food7.total) })}{food7.vsTarget != null ? ` · ${t("flVsLine", { d: signedIso(food7.vsTarget) })}` : ""}</span>
        </button>
      )}
      <MealChips date={today} row={row} limit={4} />
      <div className="grid2">
        <button className="btn soft" onClick={() => openSheet("fuel")}>{t("addFuel")}</button>
        <button className="btn" onClick={() => openSheet("foodlog")}><Icon name="file" size={17} />{t("flOpenShort")}</button>
      </div>
    </div>
  );

  // ── Trends ──
  const since = Date.now() - 90 * DAY;
  const trendCards = keys.map((k) => {
    const tr = tracks[k];
    const pts = (tr?.points || []).filter((p) => new Date(p.date + "T00:00:00").getTime() >= since)
      .map((p) => ({ t: new Date(p.date + "T00:00:00").getTime(), v: coerceNumber(p[tr.field]), date: p.date, kind: k === "weight" ? (p.source === "scan" ? "scan" : "manual") : "scan" }))
      .filter((p) => p.v != null);
    const ch = tr ? changeOver(tr.points, tr.field, 30) : null;
    const a = tr ? arrival(tr) : null;
    const good = ch && tr?.direction ? Math.sign(ch.delta) === Math.sign(tr.direction) || ch.delta === 0 : true;
    return (
      <div className="card tight" key={k}>
        <div className="row between top">
          <div>
            <div className="row small strong" style={{ gap: 6, color: COLOR[k] }}><span className="dot" style={{ background: COLOR[k] }} />{t(LABEL[k])}</div>
            <div style={{ marginTop: 4 }}><span className="num" style={{ fontSize: 32, lineHeight: 1 }}>{tr?.curr != null ? fmtNum(tr.curr, 1) : "—"}</span> <span className="small muted strong">{unitOf(k)}</span></div>
          </div>
          <div style={{ textAlign: "end" }}>
            {ch && <div className="small strong" style={{ color: good ? "var(--ok)" : "var(--bad)" }}>{t("changeIn", { d: signed(ch.delta), u: unitOf(k), n: ch.days })}</div>}
            {a && (a.reached ? <div className="small muted">{t("etaReached")}</div> : a.date ? <div className="small muted">{t("eta", { date: fmtDate(a.date, lang) })}</div> : null)}
          </div>
        </div>
        {pts.length >= 2 ? <Spark points={pts} target={tr.target} color={COLOR[k]} dates unit={k === "bodyFat" ? "%" : unitOf(k)} height={86}
          label={`${t(LABEL[k])}: ${pts.map((p) => `${fmtDate(p.date, lang)} ${p.v}`).join(", ")}`} /> : <div className="small muted">{t("noTrend")}</div>}
        <div className="row between muted" style={{ fontSize: 11 }}><span>{t("lastNDays", { n: 90 })}</span>{tr?.target != null && <span>{t("targetTxt", { v: `${fmtNum(tr.target, 1)} ${unitOf(k)}` })}</span>}</div>
      </div>
    );
  });

  return (
    <>
      <div className="screen-head">
        <div className="sub">{fmtDate(today, lang, "weekday")}</div>
        <h1>{greet}</h1>
      </div>
      {weeklyCard}
      {goalCard}
      {fuelCard}
      <div className="card-title" style={{ padding: "2px 2px 0" }}>{t("trends")}</div>
      {trendCards}
    </>
  );
}
