// Swap one exercise for another that does the same job (same group).
import React from "react";
import { useApp } from "../ctx.js";
import { Photo, Note } from "../ui.jsx";
import { BY_ID, GROUPS, swapOptions } from "../lib/exercises.js";
import { swapInPlan } from "../lib/plan.js";

export default function SwapSheet({ ctx }) {
  const { t, lang, data, trainSession, setTrainSession, planDraft, setPlanDraft, closeSheet } = useApp();
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
    apply = (exId) => setPlanDraft((d) => ({ ...d, plan: swapInPlan(d.plan, ctx.slotId, exId) }));
  } else if (ctx.src === "train" && trainSession) {
    slot = trainSession.slots.find((s) => s.id === ctx.slotId) || null;
    siblings = trainSession.slots.filter((s) => s.id !== ctx.slotId).map((s) => s.ex);
    apply = (exId) => setTrainSession((s) => {
      const done = { ...(s.done || {}) };
      delete done[ctx.slotId];   // sets already saved stay in your history under the old exercise
      return { ...s, done, slots: s.slots.map((x) => (x.id === ctx.slotId ? { ...x, ex: exId, origEx: x.origEx || x.ex } : x)) };
    });
  }
  if (!slot) return <div className="small muted">{t("swNone")}</div>;

  const cur = BY_ID[slot.ex];
  const g = GROUPS[cur.group];
  const original = slot.origEx || (ctx.src === "plan" ? null : slot.ex);
  const options = swapOptions(slot.ex, { equipment, pain, exclude: siblings });

  return (
    <>
      <div className="card tight" style={{ borderRadius: 18 }}>
        <div className="label">{t("swCurrent")}</div>
        <div className="row">
          <Photo ex={cur} small />
          <div className="grow"><div className="strong" style={{ fontSize: 16 }}>{cur.name[L]}</div><div className="small sub">{cur.gear[L]}</div></div>
        </div>
        <div className="row wrap" style={{ gap: 6 }}>
          <span className="tag ok">{g.job[L]}</span>
          <span className="tag muscle">{g.main[L]}</span>
          {g.also && <span className="tag">+ {g.also[L]}</span>}
        </div>
      </div>
      <div className="small sub">{t("swExplain")}</div>
      {options.length ? options.map((e) => {
        const isOrig = original && e.id === original;
        return (
          <button key={e.id} className="card tight" onClick={() => { apply(e.id); closeSheet(); }} aria-label={`${t("use")} ${e.name[L]}`}
            style={{ width: "100%", textAlign: "start", color: "inherit", flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16 }}>
            <Photo ex={e} small />
            <span className="grow col" style={{ gap: 3 }}>
              <span className="row wrap" style={{ gap: 8 }}>
                <span className="strong" style={{ fontSize: 14.5 }}>{e.name[L]}</span>
                <span className={`tag ${isOrig ? "" : e.tag === "same" ? "ok" : "muscle"}`} style={{ fontSize: 10.5, padding: "1px 6px" }}>{isOrig ? t("tagOrig") : e.tag === "same" ? t("tagSame") : t("tagAngle")}</span>
              </span>
              <span className="small sub">{e.gear[L]}</span>
              <span className="small muted">{e.why[L]}</span>
            </span>
            <span className="small strong" style={{ color: "var(--accent-text)", flex: "none" }}>{t("use")}</span>
          </button>
        );
      }) : <Note kind="plain" icon="info">{t("swNone")}</Note>}
      <div className="small muted">{t("swFiltered")}</div>
    </>
  );
}
