// The weekly report: a week (Sunday → Saturday) in full — training, food, burn,
// body, the change from the week before and what to do next — the calorie
// check-in (latest week), earlier weeks, and the report as a PDF or as text.
import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../ctx.js";
import { Icon, Note } from "../ui.jsx";
import { store } from "../lib/api.js";
import { fmtDate, fmtNum, signed, signedIso } from "../lib/i18n.js";
import { localISO, addDays, liveAdjust, kcalFloor } from "../lib/body.js";
import { reportWeek, weekBefore, weeklyReport, hasContent, MIN_LOGGED } from "../lib/weekly.js";
import { reportDoc, docText, cellText } from "../lib/reportdoc.js";
import { docToPdf, shareOrSave } from "../lib/pdf.js";
import { lastPhotoDate } from "../lib/photos.js";
import { useResting } from "../hooks.js";

export const seenKey = (uid) => `evolve_week_seen_${uid}`;
export const weekRange = (r, lang) => `${fmtDate(r.from, lang)} – ${fmtDate(r.to, lang)}`;

export function useWeekly(week) {
  const { data, derived } = useApp();
  const resting = useResting();
  return useMemo(() => weeklyReport({ week, data, profile: data.profile || {}, body: derived.body, current: derived.targets?.kcal, protein: derived.targets?.protein, resting,
    targetFor: derived.targetFor, adjust: derived.targets ? liveAdjust(derived.targets) : null }),
    [week.key, data, derived, resting]);   // eslint-disable-line react-hooks/exhaustive-deps
}

// The latest report, until you open it (and only if the week has something in it).
export function useNewReport() {
  const { user } = useApp();
  const week = reportWeek(localISO());
  const r = useWeekly(week);
  return user?.id && store.get(seenKey(user.id)) !== week.key && hasContent(r) ? { week, r } : null;
}

// On the Goal tab's icon in the bottom bar: a new report is waiting.
export function NewReportDot() {
  const { t } = useApp();
  return useNewReport() ? <><span className="new-dot" aria-hidden="true" /><span className="sr-only">{t("wkNewSr")}</span></> : null;
}

// At the top of the Goal tab until you open it.
export function NewReportCard() {
  const { t, lang, openSheet } = useApp();
  const nr = useNewReport();
  if (!nr) return null;
  const { week, r: wr } = nr;
  return (
    <div className="card accent">
      <div className="row between"><span className="card-title">{t("wkTitle")}</span><span className="small muted">{weekRange(wr, lang)}</span></div>
      <div className="wk-stats">
        <div><div className="num ltr">{wr.weight.delta != null ? signed(wr.weight.delta) : "—"}</div><div className="small muted strong">{t("wkKgShort")}</div></div>
        <div><div className="num">{wr.food.days ? fmtNum(wr.food.kcal) : "—"}</div><div className="small muted strong">{t("wkAvgShort")}</div></div>
        <div><div className="num">{wr.training.workouts}</div><div className="small muted strong">{t("wkWorkoutsShort")}</div></div>
      </div>
      {wr.checkin.status === "adjust" && <div className="small strong" style={{ color: "var(--accent-text)" }}>{wr.checkin.live ? t("wkCiHintLive", { d: signedIso(wr.checkin.change) }) : t("wkCiHint", { k: fmtNum(wr.checkin.suggested) })}</div>}
      <button className="btn primary" onClick={() => openSheet("weekly", { week })}>{t("wkOpen")}</button>
    </div>
  );
}

const TONE = { ok: "var(--ok)", warn: "var(--warn)", bad: "var(--bad)" };
const KIND_COLOR = { train: "var(--accent)", food: "var(--fat)", up: "var(--accent)", stall: "var(--warn)", sync: "var(--muscle)", good: "var(--accent)" };

// The report's blocks, the way the app shows them.
function DocView({ blocks, checkin }) {
  return blocks.map((b, i) => {
    if (b.type === "title") return null;
    if (b.type === "sub") return null;
    if (b.type === "stats") {
      return (
        <div key={i} className="rp-stats">
          {b.items.map((x, j) => (
            <div key={j} className="box rp-stat">
              <div className="num">{x.v}</div>
              <div className="small muted strong">{x.l}</div>
              {x.d?.text && <div className="small" style={{ color: TONE[x.d.tone] || "var(--sub)", fontWeight: 600 }}>{x.d.text}</div>}
            </div>
          ))}
        </div>
      );
    }
    if (b.type === "h2") return <div key={i} className="row rp-h2"><Icon name={b.icon || "info"} size={18} color="var(--accent)" /><span>{b.text}</span></div>;
    if (b.type === "p") return <div key={i} className={b.muted ? "small muted" : "body"} style={{ color: b.muted ? undefined : "var(--text2)" }}>{b.text}</div>;
    if (b.type === "bars") {
      return (
        <div key={i} className="col" style={{ gap: 6 }}>
          {b.title && <div className="label" style={{ margin: 0 }}>{b.title}</div>}
          {b.items.map((x) => (
            <div key={x.l} className="rp-bar">
              <span className="small strong">{x.l}</span>
              <span className="track"><span style={{ width: `${Math.max(4, (x.v / (x.max || 1)) * 100)}%` }} /></span>
              <span className="small sub">{x.text}</span>
            </div>
          ))}
        </div>
      );
    }
    if (b.type === "table") {
      const cols = b.cols.map((c) => `minmax(0, ${c.w || 1}fr)`).join(" ");
      return (
        <div key={i} className="col" style={{ gap: 6 }}>
          {b.title && <div className="label" style={{ margin: 0 }}>{b.title}</div>}
          <div className="rp-table" role="table">
            <div className="rp-tr head" role="row" style={{ gridTemplateColumns: cols }}>
              {b.cols.map((c, j) => <span key={j} role="columnheader" className={c.end ? "end" : ""}>{c.h}</span>)}
            </div>
            {b.rows.map((row, r) => (
              <div key={r} className="rp-tr" role="row" style={{ gridTemplateColumns: cols }}>
                {row.map((c, j) => (
                  <span key={j} role="cell" className={`${b.cols[j].end ? "end" : ""}${j === 0 ? " first" : ""}`} style={c && typeof c === "object" && c.tone ? { color: TONE[c.tone], fontWeight: 700 } : undefined}>
                    {b.cols[j].ltr ? <span className="ltr">{cellText(c)}</span> : cellText(c)}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (b.type === "list") {
      return (
        <div key={i} className="col" style={{ gap: 8 }}>
          {b.items.map((x, j) => (
            <div key={j} className="rp-rec"><Icon name={x.icon || "info"} size={17} color={KIND_COLOR[x.kind] || "var(--accent)"} /><span>{x.text}</span></div>
          ))}
        </div>
      );
    }
    if (b.type === "checkin") {
      if (checkin) return <React.Fragment key={i}>{checkin}</React.Fragment>;
      return b.text ? (
        <div key={i} className="card tight"><div className="row" style={{ gap: 8 }}><Icon name="goal" size={18} color="var(--accent)" /><span className="card-title">{b.title}</span></div><div className="small sub">{b.text}</div></div>
      ) : null;
    }
    return null;
  });
}

export default function Weekly({ ctx }) {
  const { t, lang, rtl, user, data, derived, setKcalLock, kcalLock, closeSheet, toast, setTab, openSheet } = useApp();
  const latest = reportWeek(localISO());
  const [week, setWeek] = useState(ctx.week || latest);
  const isLatest = week.key === latest.key;
  const r = useWeekly(week);
  const name = data.profile?.display_name || "";
  const blocks = useMemo(() => reportDoc(r, { t, lang, name }), [r, lang, name]);   // eslint-disable-line react-hooks/exhaustive-deps
  const range = weekRange(r, lang);
  const [photoDate, setPhotoDate] = useState(undefined);
  useEffect(() => { lastPhotoDate(user.id).then(setPhotoDate); }, [user.id]);
  const photosDue = isLatest && photoDate !== undefined && (!photoDate || photoDate < addDays(localISO(), -14));
  const seen = () => { if (isLatest) store.set(seenKey(user.id), week.key); };
  useEffect(() => { if (isLatest && user?.id) store.set(seenKey(user.id), week.key); }, [isLatest, week.key, user?.id]);   // opened = seen (the dot and the Goal card go)
  const ci = r.checkin;
  const [pdf, setPdf] = useState(null);   // null | "making" | { blob }   (a ready file waiting for a tap to share)
  useEffect(() => { setPdf(null); }, [week.key, lang]);

  const title = `${t("rpTitle")} ${range}`;
  const filename = `evolve-week-${r.from}.pdf`;
  const makePdf = async () => {
    if (pdf === "making") return;
    if (pdf?.blob) { const res = await shareOrSave(pdf.blob, filename, { title }); if (res !== "needs-tap") setPdf(null); if (res === "downloaded") toast(t("rpSaved")); return; }
    setPdf("making");
    try {
      const blob = await docToPdf(blocks, { lang, title });
      const res = await shareOrSave(blob, filename, { title });
      setPdf(res === "needs-tap" ? { blob } : null);
      if (res === "downloaded") toast(t("rpSaved"));
    } catch { setPdf(null); toast(t("rpPdfFail")); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(docText(blocks)); toast(t("rpCopied")); } catch { toast(t("rpCopyFail")); }
  };

  // Applying moves your plan and what's taken off your burn by the same step.
  const sameGoal = !!kcalLock && kcalLock.goalKey === derived.goalKey;
  const applied = isLatest && sameGoal && kcalLock.week === week.key;
  const adj = derived.targets ? liveAdjust(derived.targets) : 0;
  const apply = () => {
    const plan = Math.max((derived.targets?.kcal || ci.current) + ci.change, kcalFloor(derived.maint?.bmr?.kcal, data.profile?.sex));
    setKcalLock({ ...(sameGoal ? kcalLock : {}), kcal: plan, shift: ((sameGoal && kcalLock.shift) || 0) + ci.change, goalKey: derived.goalKey, since: localISO(), week: week.key });
    seen(); toast(ci.live ? t("ciAppliedBy", { a: signedIso(adj + ci.change) }) : t("ciApplied", { k: fmtNum(plan) })); closeSheet();
  };
  const keep = () => { seen(); closeSheet(); };
  const goPhotos = () => { seen(); store.set("evolve_body_seg", "photos"); closeSheet(); setTab("body"); window.scrollTo(0, 0); };

  const checkinCard = isLatest ? (
    <div className="card tight checkin">
      <div className="row" style={{ gap: 8 }}><Icon name="goal" size={18} color="var(--accent)" /><span className="card-title">{t("ciTitle")}</span></div>
      {applied ? (
        <>
          <Note>{t("ciDone")}</Note>
          <button className="btn primary" onClick={keep}>{t("done")}</button>
        </>
      ) : ci.status === "adjust" || ci.status === "ok" ? (
        <>
          <div className="body">{t("ciBurn", { b: fmtNum(ci.burn), i: fmtNum(ci.avgIn), w: signed(ci.kgPerWeek, 2) })}</div>
          {r.food.days > 0 && r.food.kcal - ci.current > 150 && <Note kind="warn" icon="info">{t("ciOver", { d: fmtNum(Math.round(r.food.kcal - ci.current)) })}</Note>}
          {r.food.days > 0 && ci.current - r.food.kcal > 300 && <Note kind="warn" icon="info">{t("ciUnder", { d: fmtNum(Math.round(ci.current - r.food.kcal)) })}</Note>}
          {ci.status === "adjust" ? (
            <>
              {ci.live ? (
                <div className="ci-change strong">{t("ciLiveLine", { a: signedIso(adj), b: signedIso(adj + ci.change) })}</div>
              ) : (
                <div className="ci-change">
                  <span className="num ltr">{fmtNum(ci.current)}</span><span className="muted"> → </span><span className="num ltr" style={{ color: "var(--accent-text)" }}>{fmtNum(ci.suggested)}</span>
                  <span className="small muted"> {t("kcal")} ({ci.change > 0 ? "+" : "−"}{fmtNum(Math.abs(ci.change))})</span>
                </div>
              )}
              <div className="small sub">{t(ci.change < 0 ? "ciWhyDown" : "ciWhyUp", { g: ci.goalPerWeek != null ? signed(ci.goalPerWeek, 2) : "—" })}</div>
              <button className="btn primary" onClick={apply}>{ci.live ? t("ciApplyBy", { d: signedIso(ci.change) }) : t("ciApply", { k: fmtNum(ci.suggested) })}</button>
              <button className="btn ghost" onClick={keep}>{ci.live ? t("ciKeepAsIs") : t("ciKeep", { k: fmtNum(ci.current) })}</button>
            </>
          ) : (
            <>
              <Note>{ci.live ? t("ciOkLive", { a: signedIso(adj) }) : t("ciOk", { k: fmtNum(ci.current) })}</Note>
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
      <div className="small muted">{t(ci.live ? "ciRulesLive" : "ciRules")}</div>
    </div>
  ) : null;

  return (
    <>
      <div className="rp-nav">
        <button type="button" className="icon-btn" onClick={() => setWeek(weekBefore(week))} aria-label={t("rpPrev")}><Icon name="back" flip={rtl} /></button>
        <div className="col" style={{ alignItems: "center", gap: 1, minWidth: 0 }}>
          <span className="strong" style={{ fontSize: 16 }}>{range}</span>
          <span className="small muted">{isLatest ? t("rpLatest") : t("rpEarlier")}</span>
        </div>
        <button type="button" className="icon-btn" disabled={isLatest} onClick={() => setWeek(weekBefore(week, -1))} aria-label={t("rpNext")}><Icon name="next" flip={rtl} /></button>
      </div>
      <div className="grid2">
        <button type="button" className={`btn ${pdf?.blob ? "primary" : "soft"}`} onClick={makePdf} disabled={pdf === "making"}>
          <Icon name="file" size={17} />{pdf === "making" ? t("rpMaking") : pdf?.blob ? t("rpShareReady") : t("rpPdf")}
        </button>
        <button type="button" className="btn" onClick={copy}><Icon name="copy" size={17} />{t("rpCopy")}</button>
      </div>
      <button type="button" className="link" style={{ alignSelf: "center" }} onClick={() => openSheet("weeks")}>{t("rpAll")}</button>

      <DocView blocks={blocks} checkin={checkinCard} />

      {photosDue && (
        <div className="note plain" style={{ alignItems: "center" }}>
          <Icon name="camera" size={16} color="var(--muted)" />
          <span className="grow">{t("wkPhotos")}</span>
          <button className="link" style={{ minHeight: 0, padding: 0 }} onClick={goPhotos}>{t("wkPhotosGo")}</button>
        </div>
      )}
    </>
  );
}
