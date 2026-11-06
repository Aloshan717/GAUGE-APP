// Add any exercise to today's session — from the library, or one of your own.
import React, { useState } from "react";
import { useApp } from "../ctx.js";
import { Chips, Photo, Field, Icon } from "../ui.jsx";
import { EXERCISES, GROUPS, MUSCLES, MUSCLE_NAMES, usable } from "../lib/exercises.js";
import { makeSlot, makeCustomSlot } from "../lib/train.js";
import { localISO } from "../lib/body.js";

export default function AddExercise({ ctx }) {
  const { t, lang, data, trainSession, setTrainSession, closeSheet, toast } = useApp();
  const L = lang === "ar" ? 1 : 0;
  const profile = data.profile || {};
  const [muscle, setMuscle] = useState(ctx.muscle || "Chest");
  const [all, setAll] = useState(false);
  const [name, setName] = useState("");
  const inSession = new Set((trainSession?.slots || []).map((s) => s.ex).filter(Boolean));
  const opts = { equipment: profile.equipment || "gym", pain: profile.pain || [] };
  const list = EXERCISES.filter((e) => GROUPS[e.group].muscle === muscle && (all || usable(e, opts)));

  const push = (slot) => {
    setTrainSession((s) => {
      const base = s && s.date === localISO() ? s : { date: localISO(), source: "pick", muscles: [], counts: {}, slots: [], done: {}, mode: "manual" };
      const muscles = base.source === "pick" && !base.muscles.includes(muscle) ? [...base.muscles, muscle] : base.muscles;
      const counts = base.source === "pick" && !(muscle in (base.counts || {})) ? { ...(base.counts || {}), [muscle]: 0 } : base.counts;
      return { ...base, muscles, counts, slots: [...(base.slots || []), base.sets ? { ...slot, sets: base.sets } : slot] };
    });
  };
  const addLib = (e) => { push(makeSlot({ group: e.group, ex: e.id, muscle, profile, manual: true })); toast(t("added", { name: e.name[L] })); closeSheet(); };
  const addOwn = () => {
    const n = name.trim();
    if (!n) return;
    push(makeCustomSlot({ name: n, muscle }));
    toast(t("added", { name: n }));
    closeSheet();
  };

  return (
    <>
      <Chips small options={MUSCLES.map((m) => [m, MUSCLE_NAMES[m][L]])} value={muscle} onChange={setMuscle} />
      <button type="button" className="chip sm" aria-pressed={all} onClick={() => setAll((x) => !x)} style={{ alignSelf: "flex-start" }}>{t("showAll")}</button>
      {list.map((e) => {
        const there = inSession.has(e.id);
        return (
          <button key={e.id} className="card tight" disabled={there} onClick={() => addLib(e)} aria-label={`${t("add")} ${e.name[L]}`}
            style={{ width: "100%", textAlign: "start", color: "inherit", flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16 }}>
            <Photo ex={e} small />
            <span className="grow col" style={{ gap: 2 }}>
              <span className="strong" style={{ fontSize: 14.5 }}>{e.name[L]}</span>
              <span className="small sub">{e.gear[L]}</span>
              <span className="small muted">{GROUPS[e.group].main[L]} · {GROUPS[e.group].job[L]}</span>
            </span>
            <span className="small strong" style={{ color: there ? "var(--muted)" : "var(--accent-text)", flex: "none" }}>{there ? t("inSession") : t("add")}</span>
          </button>
        );
      })}
      <div className="divider" />
      <Field label={t("ownEx")}>
        <div className="row" style={{ gap: 8 }}>
          <input className="input grow" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("ownExPh")} />
          <button className="btn primary" onClick={addOwn} disabled={!name.trim()}><Icon name="plus" size={18} />{t("add")}</button>
        </div>
      </Field>
    </>
  );
}
