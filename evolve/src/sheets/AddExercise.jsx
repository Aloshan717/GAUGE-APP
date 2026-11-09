// Add any exercise to today's session — search the whole library, pick from a
// muscle, or add your own (with the part it works and a photo, kept for next time).
import React, { useMemo, useState } from "react";
import { useApp } from "../ctx.js";
import { Chips, Photo, Icon, MuscleMap } from "../ui.jsx";
import { EXERCISES, GROUPS, MUSCLES, MUSCLE_NAMES, usable } from "../lib/exercises.js";
import { musclesOf, customMuscles, muscleNames, searchExercises, fold, PARTS } from "../lib/muscles.js";
import { makeSlot, makeCustomSlot } from "../lib/train.js";
import { myExercises, saveMine, shrinkPhoto } from "../lib/myex.js";
import { localISO } from "../lib/body.js";

function Row({ ex, muscles, sub, there, onAdd, onInfo, group }) {
  const { t, lang } = useApp();
  const L = lang === "ar" ? 1 : 0;
  return (
    <div className="card tight pick-row">
      <button type="button" className="ex-media" onClick={onInfo} aria-label={t("exInfoA11y", { name: ex.name[L] })}><Photo ex={ex} small /></button>
      <button type="button" className="pick-main" disabled={there} onClick={onAdd} aria-label={`${t("add")} ${ex.name[L]}`}>
        <span className="grow col" style={{ gap: 2 }}>
          <span className="strong" style={{ fontSize: 14.5 }}>{ex.name[L]}</span>
          {sub && <span className="small sub">{sub}</span>}
          <span className="small" style={{ color: "var(--accent-text)", fontWeight: 700 }}>{muscleNames(muscles.primary, lang).join(" · ")}</span>
        </span>
        <MuscleMap muscles={muscles} height={50} views="main" zoom group={group} />
        <span className="small strong" style={{ color: there ? "var(--muted)" : "var(--accent-text)", flex: "none" }}>{there ? t("inSession") : t("add")}</span>
      </button>
    </div>
  );
}

export default function AddExercise({ ctx }) {
  const { t, lang, data, trainSession, setTrainSession, closeSheet, toast, openSheet } = useApp();
  const L = lang === "ar" ? 1 : 0;
  const profile = data.profile || {};
  const [muscle, setMuscle] = useState(ctx.muscle || "Chest");
  const [all, setAll] = useState(false);
  const [q, setQ] = useState(ctx.q || "");
  const [name, setName] = useState("");
  const [ownMuscle, setOwnMuscle] = useState(ctx.muscle || "Chest");
  const [parts, setParts] = useState([]);
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const mine = useMemo(() => myExercises(), []);
  const inSession = new Set((trainSession?.slots || []).map((s) => s.ex || (s.custom ? `my:${s.name.toLowerCase()}` : null)).filter(Boolean));
  const opts = { equipment: profile.equipment || "gym", pain: profile.pain || [] };
  const searching = q.trim().length > 0;
  const list = searching ? searchExercises(q) : EXERCISES.filter((e) => GROUPS[e.group].muscle === muscle && (all || usable(e, opts)));
  const myList = mine.filter((e) => (searching ? fold(`${e.name} ${muscleNames(e.parts || [], "en")} ${muscleNames(e.parts || [], "ar")}`).includes(fold(q)) : e.muscle === muscle));
  const back = { name: "addEx", opts: { muscle, q } };

  const push = (slot, m) => {
    setTrainSession((s) => {
      const base = s && s.date === localISO() ? s : { date: localISO(), source: "pick", muscles: [], counts: {}, slots: [], done: {}, mode: "manual" };
      const muscles = base.source === "pick" && m && !base.muscles.includes(m) ? [...base.muscles, m] : base.muscles;
      const counts = base.source === "pick" && m && !(m in (base.counts || {})) ? { ...(base.counts || {}), [m]: 0 } : base.counts;
      return { ...base, muscles, counts, slots: [...(base.slots || []), base.sets ? { ...slot, sets: base.sets } : slot] };
    });
  };
  const addLib = (e) => {
    const m = GROUPS[e.group].muscle;
    push(makeSlot({ group: e.group, ex: e.id, muscle: m, profile, manual: true }), m);
    toast(t("added", { name: e.name[L] }));
    closeSheet();
  };
  const addMine = (e) => { push(makeCustomSlot({ name: e.name, muscle: e.muscle, parts: e.parts }), e.muscle); toast(t("added", { name: e.name })); closeSheet(); };
  const addOwn = () => {
    const n = name.trim();
    if (!n) return;
    const kept = saveMine({ name: n, muscle: ownMuscle, parts, photo, added: Date.now() });
    if (!kept && photo) toast(t("photoFull"));
    push(makeCustomSlot({ name: n, muscle: ownMuscle, parts }), ownMuscle);
    if (kept || !photo) toast(t("added", { name: n }));
    closeSheet();
  };
  const pickPhoto = async (file) => {
    if (!file) return;
    setBusy(true);
    try { setPhoto(await shrinkPhoto(file)); } catch { toast(t("photoFail")); }
    setBusy(false);
  };
  const togglePart = (k) => setParts((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  return (
    <>
      <label className="search">
        <Icon name="search" size={18} />
        <input className="grow" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchPh")} aria-label={t("searchPh")} />
        {searching && <button type="button" className="del" onClick={() => setQ("")} aria-label={t("clear")}><Icon name="close" size={16} /></button>}
      </label>
      {!searching && (
        <>
          <Chips small options={MUSCLES.map((m) => [m, MUSCLE_NAMES[m][L]])} value={muscle} onChange={(m) => { setMuscle(m); setOwnMuscle(m); setParts([]); }} />
          <button type="button" className="chip sm" aria-pressed={all} onClick={() => setAll((x) => !x)} style={{ alignSelf: "flex-start" }}>{t("showAll")}</button>
        </>
      )}
      {myList.length > 0 && <div className="label">{t("myEx")}</div>}
      {myList.map((e) => (
        <Row key={`my-${e.name}`} ex={{ id: null, name: [e.name, e.name], gear: ["", ""], img: null, photo: e.photo }} muscles={customMuscles(e.muscle, e.parts)}
          sub={`${t("ownExTag")} · ${MUSCLE_NAMES[e.muscle]?.[L] || e.muscle}`} there={inSession.has(`my:${e.name.toLowerCase()}`)}
          onAdd={() => addMine(e)} onInfo={() => openSheet("exInfo", { name: e.name, muscle: e.muscle, backTo: back })} />
      ))}
      {myList.length > 0 && list.length > 0 && <div className="label">{t("libraryEx")}</div>}
      {list.map((e) => (
        <Row key={e.id} ex={e} muscles={musclesOf(e)} group={e.group} sub={searching ? `${MUSCLE_NAMES[GROUPS[e.group].muscle][L]} · ${e.gear[L]}` : e.gear[L]}
          there={inSession.has(e.id)} onAdd={() => addLib(e)} onInfo={() => openSheet("exInfo", { ex: e.id, backTo: back })} />
      ))}
      {searching && !list.length && !myList.length && <div className="small muted">{t("searchNone")}</div>}

      <div className="divider" />
      <div className="card tight" style={{ gap: 12 }}>
        <div className="strong">{t("ownEx")}</div>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("ownExPh")} aria-label={t("ownEx")} />
        <div className="label">{t("ownMuscleLbl")}</div>
        <Chips small options={MUSCLES.map((m) => [m, MUSCLE_NAMES[m][L]])} value={ownMuscle} onChange={(m) => { setOwnMuscle(m); setParts([]); }} />
        {(PARTS[ownMuscle] || []).length > 1 && (
          <>
            <div className="label">{t("ownPartsLbl")}</div>
            <Chips small multi options={PARTS[ownMuscle].map((k) => [k, muscleNames([k], lang)[0]])} value={parts} onChange={togglePart} />
          </>
        )}
        <div className="row" style={{ gap: 10 }}>
          {photo && <div className="ex-photo sm"><img src={photo} alt="" /></div>}
          <label className="btn sm" style={{ cursor: "pointer" }}>
            <Icon name="camera" size={16} />{busy ? t("saving") : photo ? t("ownPhotoChange") : t("ownPhoto")}
            <input type="file" accept="image/*" hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
          </label>
          <span className="grow" />
          <MuscleMap muscles={customMuscles(ownMuscle, parts)} height={50} views="main" zoom />
        </div>
        <button className="btn primary" onClick={addOwn} disabled={!name.trim() || busy}><Icon name="plus" size={18} />{t("add")}</button>
        <div className="small muted">{t("ownExKept")}</div>
      </div>
    </>
  );
}
