// One exercise up close: how it looks (start → end) and the muscles it works.
import React from "react";
import { useApp } from "../ctx.js";
import { Photo, MuscleMap } from "../ui.jsx";
import { BY_ID, GROUPS, MUSCLE_NAMES } from "../lib/exercises.js";
import { musclesOf, slotMuscles, muscleNames } from "../lib/muscles.js";

export default function ExerciseInfo({ ctx }) {
  const { t, lang } = useApp();
  const L = lang === "ar" ? 1 : 0;
  const ex = ctx.ex ? BY_ID[ctx.ex] : null;
  const m = ex ? musclesOf(ex) : slotMuscles({ custom: true, muscle: ctx.muscle });
  const g = ex ? GROUPS[ex.group] : null;
  const main = muscleNames(m.primary, lang), helps = muscleNames(m.secondary, lang);
  return (
    <>
      <div className="col" style={{ gap: 3 }}>
        <div className="strong" style={{ fontSize: 18, lineHeight: 1.3 }}>{ex ? ex.name[L] : ctx.name}</div>
        <div className="small sub">{ex ? ex.gear[L] : `${t("ownExTag")} · ${(MUSCLE_NAMES[ctx.muscle] || [ctx.muscle, ctx.muscle])[L]}`}</div>
      </div>
      {ex?.img && (
        <div className="grid2">
          <div className="col" style={{ gap: 4 }}><Photo ex={ex} big frame={0} /><span className="small muted center">{t("exStart")}</span></div>
          <div className="col" style={{ gap: 4 }}><Photo ex={ex} big frame={1} /><span className="small muted center">{t("exEnd")}</span></div>
        </div>
      )}
      <div className="mbox">
        <MuscleMap muscles={m} height={190} captions={[t("bodyFront"), t("bodyBack")]} label={t("worksA11y", { list: [...main, ...helps].join(", ") })} />
        <div className="mnames">
          <div><div className="k"><span className="dot" />{t("mainMuscles")}</div><div className="v">{main.join(" · ")}</div></div>
          {helps.length > 0 && <div><div className="k"><span className="dot s" />{t("helperMuscles")}</div><div className="v">{helps.join(" · ")}</div></div>}
        </div>
      </div>
      {g && <div className="row wrap" style={{ gap: 6 }}><span className="tag ok">{g.job[L]}</span>{ex.tag === "angle" && <span className="tag muscle">{t("tagAngle")}</span>}</div>}
      {ex ? <div className="small sub">{ex.why[L]}</div> : <div className="small muted">{t("ownExMap")}</div>}
    </>
  );
}
