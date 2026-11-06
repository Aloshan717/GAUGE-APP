// Home: progress vs time for weight, body fat and Muscle Mass; today's fuel; trends.
import React from "react";
import { useApp } from "../ctx.js";
import { Icon, Ring, Spark, Bar } from "../ui.jsx";
import { fmtDate, fmtNum, signed, joinList } from "../lib/i18n.js";
import { localISO, addDays, dayRow, burnByDate, arrival, changeOver } from "../lib/body.js";
import { coerceNumber } from "../lib/core.js";

const COLOR = { weight: "var(--accent)", bodyFat: "var(--fat)", muscle: "var(--muscle)" };
const STATUS_COLOR = { ok: "var(--ok)", warn: "var(--warn)", bad: "var(--bad)", neutral: "var(--accent)" };
const BUCKET = { "On track": "ok", "Target reached": "done", "Slightly behind": "warn", Behind: "bad", "Wrong direction": "bad", "Date passed": "bad", "Just started": "early" };
const LABEL = { weight: "mWeight", bodyFat: "mFat", muscle: "mMuscle" };
const DAY = 86400000;

export default function Home({ name }) {
  const { t, lang, data, derived, openSheet, setTab } = useApp();
  const { tracks, targets } = derived;
  const goal = data.goal;
  const hour = new Date().getHours();
  const greet = name ? t(hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening", { name }) : t("hello");
  const keys = ["weight", "bodyFat", "muscle"];
  const unitOf = (k) => (k === "bodyFat" ? "%" : t("kg"));

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
            return (
              <div className="ring-col" key={k}>
                <Ring value={has ? fmtNum(tr.curr, 1) : "—"} unit={unitOf(k)} progress={p?.progress} time={p?.elapsed} color={STATUS_COLOR[p?.color] || "var(--surface3)"} />
                <span className="row small strong" style={{ gap: 5, color: "var(--text2)", whiteSpace: "nowrap" }}><span className="dot" style={{ background: COLOR[k] }} />{t(LABEL[k])}</span>
                {p ? (
                  <span className="small strong" style={{ color: STATUS_COLOR[p.color] }}>{Math.round(p.progress)}% <span className="muted" style={{ fontWeight: 600 }}>· {t("timeWord")} {Math.round(p.elapsed ?? 0)}%</span></span>
                ) : <span className="small muted">{has ? "—" : t("noReading")}</span>}
                {tr?.target != null && <span className="muted" style={{ fontSize: 11 }}><span aria-hidden="true">{lang === "ar" ? "←" : "→"}</span> {fmtNum(tr.target, 1)} {unitOf(k)}</span>}
              </div>
            );
          })}
        </div>
        <div className="legend">
          <span><span style={{ width: 14, height: 5, borderRadius: 3, background: "var(--accent)" }} />{t("legendProgress")}</span>
          <span><span style={{ width: 14, height: 4, borderRadius: 2, background: "var(--sub)" }} />{t("legendTime")}</span>
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
  const fuelRow = (label, eaten, target, unit, color) => {
    const pct = target ? (eaten / target) * 100 : 0;
    const diff = target ? target - eaten : null;
    return (
      <div className="col" style={{ gap: 6 }}>
        <div className="row between" style={{ alignItems: "baseline" }}>
          <span className="small strong sub">{label}</span>
          <span className="small muted"><span className="num" style={{ fontSize: 22, color: "var(--text)" }}>{fmtNum(eaten)}</span>{target ? ` / ${fmtNum(target)} ${unit}` : ` ${unit}`}</span>
        </div>
        <Bar pct={pct} color={diff != null && diff < 0 && label === t("calLabel") ? "var(--warn)" : color} />
        {diff != null && <span className="small strong" style={{ color: diff < 0 && label === t("calLabel") ? "var(--warn)" : color }}>
          {diff > 0 ? t("left", { n: fmtNum(diff), u: unit }) : diff === 0 ? t("reachedFuel") : label === t("calLabel") ? t("over", { n: fmtNum(-diff), u: unit }) : t("reachedFuel")}
        </span>}
      </div>
    );
  };

  const fuelCard = (
    <div className="card">
      <div className="row between">
        <span className="card-title">{t("fuelTitle")}</span>
        <span className="row small muted" style={{ gap: 5 }}>
          {lastWatch ? <><Icon name="check" size={14} stroke={2.4} color="var(--accent)" />{t("synced", { date: fmtDate(lastWatch, lang) })}</> : t("notSynced")}
        </span>
      </div>
      {fuelRow(t("calLabel"), kIn, targets?.kcal, t("kcal"), "var(--ok)")}
      {fuelRow(t("proLabel"), pIn, targets?.protein, t("g"), "var(--muscle)")}
      {!goal && <div className="small muted">{t("noTargets")}</div>}
      {goal && targets && !targets.kcal && (
        <div className="note warn"><Icon name="info" size={16} color="var(--warn)" /><span>{t("needProfile")} <button className="link" style={{ padding: 0, minHeight: 0 }} onClick={() => openSheet("profile")}>{t("addProfile")}</button></span></div>
      )}
      <button className="row between box" style={{ border: "none", width: "100%", color: "inherit", textAlign: "start" }} onClick={() => openSheet("burn")}>
        <span className="row small sub" style={{ gap: 8 }}><Icon name="flame" size={18} color="var(--fat)" />{burnToday ? t("burnToday") : burnYest ? t("burnYesterday") : t("noBurn")}</span>
        {(burnToday || burnYest) && <span className="num" style={{ fontSize: 20 }}>{fmtNum(burnToday || burnYest)} <span className="small muted" style={{ fontFamily: "inherit" }}>{t("kcal")}</span></span>}
      </button>
      <button className="btn soft" onClick={() => openSheet("fuel")}>{t("addFuel")}</button>
    </div>
  );

  // ── Trends ──
  const since = Date.now() - 90 * DAY;
  const trendCards = keys.map((k) => {
    const tr = tracks[k];
    const pts = (tr?.points || []).filter((p) => new Date(p.date + "T00:00:00").getTime() >= since)
      .map((p) => ({ t: new Date(p.date + "T00:00:00").getTime(), v: coerceNumber(p[tr.field]) })).filter((p) => p.v != null);
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
        {pts.length >= 2 ? <Spark points={pts} target={tr.target} color={COLOR[k]} label={`${t(LABEL[k])}: ${pts.map((p) => p.v).join(", ")}`} /> : <div className="small muted">{t("noTrend")}</div>}
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
      {goalCard}
      {fuelCard}
      <div className="card-title" style={{ padding: "2px 2px 0" }}>{t("trends")}</div>
      {trendCards}
    </>
  );
}
