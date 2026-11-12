// Swap one exercise for another that does the same job (same group): first the
// ones that work the same part of the muscle ("same angle"), then the others,
// grouped by the part they work.
import React from "react";
import { useApp } from "../ctx.js";
import { Photo, Note, MuscleMap } from "../ui.jsx";
import { BY_ID, GROUPS, swapOptions } from "../lib/exercises.js";
import { musclesOf, muscleNames, sameAngle } from "../lib/muscles.js";
import { swapInPlan } from "../lib/plan.js";

// Put `exId` in the slot being swapped — in today's workout or in the plan draft.
export function swapApplier({ src, slotId }, { setTrainSession, setPlanDraft }) {
  if (src === "plan") return (exId) => setPlanDraft((d) => ({ ...d, plan: swapInPlan(d.plan, slotId, exId) }));
  return (exId) => setTrainSession((s) => {
    if (!s) return s;
    const done = { ...(s.done || {}) };
    delete done[slotId];   // sets already saved stay in your history under the old exercise
    return { ...s, done, slots: s.slots.map((x) => (x.id === slotId ? { ...x, ex: exId, origEx: x.origEx || x.ex } : x)) };
  });
}

export default function SwapSheet({ ctx }) {
  const { t, lang, data, trainSession, setTrainSession, planDraft, setPlanDraft, closeSheet, openSheet } = useApp();
  const L = lang === "ar" ? 1 : 0;
  const profile = data.profile || {};

  // Find the slot being swapped, the other exercises around it, and how to apply a choice.
  let slot = null, siblings = [], apply = null, equipment = profile.equipment || "gym", pain = profile.pain || [];
  if (ctx.src === "plan" && planDraft?.plan) {
    const day = planDraft.plan.days.find((d) => d.slots.some((s) => s.id === ctx.slotId));
    slot = day?.slots.find((s) => s.id === ctx.slotId) || null;
    siblings = (day?.slots || []).filter((s) => s.id !== ctx.slotId).map((s) => s.ex);
    equipment = planDraft.answers?.equipment || equipment;
    pain = planDraft.answers?.pain || pain;
    apply = swapApplier(ctx, { setTrainSession, setPlanDraft });
  } else if (ctx.src === "train" && trainSession) {
    slot = trainSession.slots.find((s) => s.id === ctx.slotId) || null;
    siblings = trainSession.slots.filter((s) => s.id !== ctx.slotId).map((s) => s.ex);
    apply = swapApplier(ctx, { setTrainSession, setPlanDraft });
  }
  if (!slot || !BY_ID[slot.ex]) return <div className="small muted">{t("swNone")}</div>;

  const cur = BY_ID[slot.ex];
  const g = GROUPS[cur.group];
  const original = slot.origEx || (ctx.src === "plan" ? null : slot.ex);
  const options = swapOptions(slot.ex, { equipment, pain, exclude: siblings });
  // An alternative's details carry a "Use this exercise" button (and whether it is the same angle).
  const info = (id) => openSheet("exInfo", { ex: id, choose: id !== cur.id ? { src: ctx.src, slotId: ctx.slotId } : null,
    same: id !== cur.id && sameAngle(cur, BY_ID[id]), backTo: { name: "swap", opts: { src: ctx.src, slotId: ctx.slotId } } });
  const curM = musclesOf(cur);
  const same = options.filter((e) => sameAngle(cur, e));
  const clusters = [];
  for (const e of options.filter((x) => !sameAngle(cur, x))) {
    const k = musclesOf(e).primary[0] || "";
    let c = clusters.find((x) => x.k === k);
    if (!c) clusters.push((c = { k, list: [] }));
    c.list.push(e);
  }
  const row = (e, isSame) => {
    const isOrig = original && e.id === original;
    const em = musclesOf(e);
    return (
      <div key={e.id} className={`card tight pick-row${isSame ? " same" : ""}`}>
        <button type="button" className="ex-media" onClick={() => info(e.id)} aria-label={t("exInfoA11y", { name: e.name[L] })}><Photo ex={e} small /></button>
        <button type="button" className="pick-main" onClick={() => { apply(e.id); closeSheet(); }} aria-label={`${t("use")} ${e.name[L]}${isSame ? ` · ${t("tagSameAngle")}` : ""}`}>
          <span className="grow col" style={{ gap: 3 }}>
            <span className="row wrap" style={{ gap: 8 }}>
              <span className="strong" style={{ fontSize: 14.5 }}>{e.name[L]}</span>
              {(isOrig || isSame) && <span className={`tag ${isOrig ? "" : "ok"}`} style={{ fontSize: 10.5, padding: "1px 6px" }}>{isOrig ? t("tagOrig") : `✓ ${t("tagSameAngle")}`}</span>}
            </span>
            <span className="small sub">{e.gear[L]}</span>
            <span className="small muted">{e.why[L]}</span>
            <span className="small" style={{ color: "var(--accent-text)", fontWeight: 700 }}>{muscleNames(em.primary, lang).join(" · ")}</span>
          </span>
          <MuscleMap muscles={em} height={52} views="main" zoom group={e.group} />
          <span className="small strong" style={{ color: "var(--accent-text)", flex: "none" }}>{t("use")}</span>
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="card tight" style={{ borderRadius: 18 }}>
        <div className="label">{t("swCurrent")}</div>
        <div className="row">
          <button type="button" className="ex-media" onClick={() => info(cur.id)} aria-label={t("exInfoA11y", { name: cur.name[L] })}><Photo ex={cur} small /></button>
          <div className="grow"><div className="strong" style={{ fontSize: 16 }}>{cur.name[L]}</div><div className="small sub">{cur.gear[L]}</div></div>
          <MuscleMap muscles={curM} height={64} views="main" zoom group={cur.group} label={t("worksA11y", { list: muscleNames([...curM.primary, ...curM.secondary], lang).join(", ") })} />
        </div>
        <div className="row wrap" style={{ gap: 6 }}>
          <span className="tag ok">{g.job[L]}</span>
          {muscleNames(curM.primary, lang).map((m) => <span key={m} className="tag muscle">{m}</span>)}
          {curM.secondary.length > 0 && <span className="tag" style={{ whiteSpace: "normal", maxWidth: "100%" }}>+ {muscleNames(curM.secondary, lang).join(" · ")}</span>}
        </div>
      </div>
      <div className="small sub">{t("swExplain")}</div>
      {options.length ? (
        <>
          <div className="sw-sec"><span className="tag ok">✓ {t("tagSameAngle")}</span><span>{muscleNames(curM.primary, lang).join(" · ")}</span></div>
          {same.length ? same.map((e) => row(e, true)) : <Note kind="plain" icon="info">{t("swNoSame")}</Note>}
          {clusters.length > 0 && <div className="sw-sec">{t("swOther")}</div>}
          {clusters.map((c) => (
            <React.Fragment key={c.k}>
              <div className="label" style={{ margin: "2px 2px 0" }}>{muscleNames([c.k], lang)[0]}</div>
              {c.list.map((e) => row(e, false))}
            </React.Fragment>
          ))}
        </>
      ) : <Note kind="plain" icon="info">{t("swNone")}</Note>}
      <div className="small muted">{t("swFiltered")}</div>
    </>
  );
}
