// One exercise up close: how it looks (start → end), the exact muscle parts it
// works (zoomed in, plus the whole body), and every time you did it.
import React from "react";
import { useApp } from "../ctx.js";
import { Photo, MuscleMap, Spark } from "../ui.jsx";
import { BY_ID, GROUPS, MUSCLE_NAMES } from "../lib/exercises.js";
import { musclesOf, customMuscles, muscleNames, mainView } from "../lib/muscles.js";
import { liftHistory, customMatch, setsText } from "../lib/train.js";
import { findMine } from "../lib/myex.js";
import { fmtDate, fmtNum } from "../lib/i18n.js";

const LTR = (s) => `⁦${s}⁩`;

export default function ExerciseInfo({ ctx }) {
  const { t, lang, data } = useApp();
  const L = lang === "ar" ? 1 : 0;
  const ex = ctx.ex ? BY_ID[ctx.ex] : null;
  const own = ex ? null : findMine(ctx.name);
  const muscle = ex ? GROUPS[ex.group].muscle : ctx.muscle || own?.muscle;
  const m = ex ? musclesOf(ex) : customMuscles(muscle, own?.parts);
  const g = ex ? GROUPS[ex.group] : null;
  const main = muscleNames(m.primary, lang), helps = muscleNames(m.secondary, lang);
  const view = mainView(m, ex?.group);
  const other = view === "front" ? "back" : "front";
  const history = ex ? liftHistory(data.logs, ex.id) : liftHistory(data.logs, null, customMatch(ctx.name));
  const best = history.length ? Math.max(...history.map((h) => Math.max(...h.sets.map((s) => s.weight_kg)))) : null;
  const points = [...history].reverse().map((h) => ({ t: new Date(`${h.date}T12:00:00`).getTime(), v: Math.max(...h.sets.map((s) => s.weight_kg)), date: h.date }));

  return (
    <>
      <div className="col" style={{ gap: 3 }}>
        <div className="strong" style={{ fontSize: 18, lineHeight: 1.3 }}>{ex ? ex.name[L] : ctx.name}</div>
        <div className="small sub">{ex ? ex.gear[L] : `${t("ownExTag")} · ${(MUSCLE_NAMES[muscle] || [muscle, muscle])[L]}`}</div>
      </div>
      {ex?.img && (
        <div className="grid2">
          <div className="col" style={{ gap: 4 }}><Photo ex={ex} big frame={0} /><span className="small muted center">{t("exStart")}</span></div>
          <div className="col" style={{ gap: 4 }}><Photo ex={ex} big frame={1} /><span className="small muted center">{t("exEnd")}</span></div>
        </div>
      )}
      {own?.photo && <div className="ex-photo xl"><img src={own.photo} alt="" /></div>}

      <div className="mbox col">
        <div className="row wrap" style={{ justifyContent: "center", gap: 14, alignItems: "flex-end" }}>
          <MuscleMap muscles={m} height={180} views={[view]} zoom all group={ex?.group} label={t("worksA11y", { list: [...main, ...helps].join(", ") })} />
          <MuscleMap muscles={m} height={104} views={[view, other]} captions={[t(view === "front" ? "bodyFront" : "bodyBack"), t(other === "front" ? "bodyFront" : "bodyBack")]} />
        </div>
        <div className="mnames">
          <div><div className="k"><span className="dot" />{t("mainMuscles")}</div><div className="v">{main.join(" · ")}</div></div>
          {helps.length > 0 && <div><div className="k"><span className="dot s" />{t("helperMuscles")}</div><div className="v">{helps.join(" · ")}</div></div>}
        </div>
      </div>
      {g && <div className="row wrap" style={{ gap: 6 }}><span className="tag ok">{g.job[L]}</span>{ex.tag === "angle" && <span className="tag muscle">{t("tagAngle")}</span>}</div>}
      {ex ? <div className="small sub">{ex.why[L]}</div> : !own?.parts?.length && <div className="small muted">{t("ownExMap")}</div>}

      <div className="divider" />
      <div className="row between">
        <span className="card-title">{t("histAllTitle")}</span>
        {best != null && best > 0 && <span className="small muted">{t("histBest", { w: fmtNum(best, 2) })}</span>}
      </div>
      {history.length ? (
        <>
          {points.length > 1 && points.some((p) => p.v > 0) && <Spark points={points} height={70} dates unit={t("kg")} label={t("histChart")} />}
          <div className="hist">
            {history.map((h) => (
              <div key={h.date} className="hist-row">
                <span className="d">{fmtDate(h.date, lang, "day")}</span>
                <span className="v">{LTR(setsText(h.sets))}</span>
              </div>
            ))}
          </div>
        </>
      ) : <div className="small muted">{t("histNone")}</div>}
    </>
  );
}
