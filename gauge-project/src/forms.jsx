// GAUGE — everything you log, opened from the + button (or a screen's Add
// button) in a bottom sheet. A failed save keeps the form filled in.
import React, { useRef, useState } from "react";
import {
  todayISO, fmt, mergeWeightSeries, parseScanReading, musclePercent,
  SESSION_MUSCLES, workoutMuscleTabs, exerciseNames, exerciseHistory,
} from "./logic";
import { sb, auth, store } from "./api";
import { prepareScanFile, requestScan } from "./scan";
import {
  Icon, Btn, Field, Input, FormGrid, Segmented, Chips, Muted, Spinner, Banner, Card, Kicker,
} from "./ui";

export const SHEET_TITLES = {
  log: "Log", weight: "Weigh-in", scan: "InBody scan", session: "Training session",
  set: "Exercise set", measure: "Measurements",
};

// ─── MENU ────────────────────────────────────────────────────────────────────
const LOG_ITEMS = [
  { id: "weight",  icon: "scale",    title: "Weigh-in",      sub: "Today's body weight" },
  { id: "scan",    icon: "scan",     title: "InBody scan",   sub: "Photo, PDF or by hand" },
  { id: "session", icon: "activity", title: "Session",       sub: "Muscles, time, day burn" },
  { id: "set",     icon: "train",    title: "Exercise set",  sub: "Weight × reps" },
  { id: "measure", icon: "ruler",    title: "Measurements",  sub: "Waist, chest, arms…" },
];

export function LogMenu({ T, open }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
      {LOG_ITEMS.map((it, i) => (
        <button key={it.id} type="button" onClick={() => open(it.id)} className="g-press" style={{
          gridColumn: i === 0 ? "1 / -1" : undefined, textAlign: "left", cursor: "pointer", fontFamily: "inherit",
          background: T.surface, border: `1px solid ${T.divider}`, borderRadius: 18, padding: 14,
          display: "flex", flexDirection: i === 0 ? "row" : "column", alignItems: i === 0 ? "center" : "flex-start",
          gap: i === 0 ? 12 : 10, color: T.text, minHeight: 72, minWidth: 0,
        }}>
          <span style={{ width: 42, height: 42, borderRadius: 13, background: T.accent100, color: T.accent, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
            <Icon name={it.icon} size={21} />
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 15, fontWeight: 750, overflowWrap: "anywhere" }}>{it.title}</span>
            <span style={{ display: "block", fontSize: 12, color: T.n600, marginTop: 2 }}>{it.sub}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── WEIGH-IN ────────────────────────────────────────────────────────────────
export function WeighInForm({ T, data, userId, onRefresh, onDone }) {
  const [form, setForm] = useState({ weight: "", date: todayISO() });
  const [saving, setSaving] = useState(false);
  const last = mergeWeightSeries(data.weights, data.inbody).slice(-1)[0];

  const save = async () => {
    if (!form.weight || !form.date) return;
    setSaving(true);
    const { error } = await sb.insert("weight_entries", { user_id: userId, date: form.date, weight: +form.weight });
    if (error) { setSaving(false); return; }
    await onRefresh();
    setSaving(false);
    onDone();
  };

  return (
    <>
      {last && <Muted T={T}>Last weigh-in: <strong style={{ color: T.text }}>{last.weight} kg</strong> on {fmt(last.date)}</Muted>}
      <FormGrid>
        <Field T={T} label="Weight (kg)"><Input T={T} type="number" step="0.1" inputMode="decimal" placeholder="e.g. 84.5" autoFocus value={form.weight} onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))} /></Field>
        <Field T={T} label="Date"><Input T={T} type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></Field>
      </FormGrid>
      <Btn T={T} full icon="check" onClick={save} disabled={saving || !form.weight}>{saving ? "Saving…" : "Save weigh-in"}</Btn>
      <Muted T={T}>Weigh in at the same time each morning, after the bathroom and before food, for a trend you can trust.</Muted>
    </>
  );
}

// ─── INBODY SCAN ─────────────────────────────────────────────────────────────
export function ScanForm({ T, userId, onRefresh, onDone, initialMode }) {
  const [mode, setMode] = useState(() => initialMode || store.get("gauge_scan_mode") || "upload");
  const [status, setStatus] = useState("idle"); // idle | preparing | reading | confirm | saving | error
  const [errorMsg, setErrorMsg] = useState("");
  const [pending, setPending] = useState(null);
  const [notes, setNotes] = useState([]);
  const [manual, setManual] = useState({ date: todayISO(), weight: "", body_fat: "", muscle_kg: "" });
  const [manualMsg, setManualMsg] = useState("");
  const pickRef = useRef();
  const cameraRef = useRef();

  const pickMode = (m) => { setMode(m); store.set("gauge_scan_mode", m); if (status === "error") setStatus("idle"); };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErrorMsg("");
    try {
      setStatus("preparing");
      const payload = await prepareScanFile(file);
      setStatus("reading");
      const token = await auth.validToken();
      const reading = await requestScan(payload, token);
      const result = parseScanReading(reading, todayISO());
      if (!result.ok) throw new Error(result.error);
      setPending(result.data);
      setNotes(result.notes || []);
      setStatus("confirm");
    } catch (err) {
      setErrorMsg(err.message || "Could not read the scan.");
      setStatus("error");
    }
  };

  // Muscle Mass is entered and kept in kg (smm_kg). muscle_mass keeps the
  // % of body weight too, so older app versions and the coach still work.
  const saveScan = async (d) => {
    const date = d.date || todayISO();
    const w = d.weight ? +d.weight : null;
    const kg = d.muscle_kg ? +d.muscle_kg : null;
    const { error } = await sb.insert("inbody_scans", {
      user_id: userId, date, weight: w,
      body_fat: d.body_fat ? +d.body_fat : null,
      muscle_mass: kg != null ? musclePercent(kg, "kg", w) : null,
      smm_kg: kg,
    }, { optional: ["smm_kg"] });
    if (error) return false;
    // A scan is also a weigh-in — log it so Today and Body never disagree
    if (w) await sb.insert("weight_entries", { user_id: userId, date, weight: w });
    return true;
  };

  const confirmSave = async () => {
    if (pending.muscle_kg && !pending.weight) { setNotes((n) => ["Add the weight too — Muscle Mass is saved with it.", ...n]); return; }
    setStatus("saving");
    if (!(await saveScan(pending))) { setStatus("confirm"); return; }   // keep the reading
    await onRefresh();
    onDone();
  };

  const saveManual = async () => {
    if (!manual.date) return;
    if (manual.muscle_kg && !manual.weight) { setManualMsg("Enter your weight too — Muscle Mass is saved with it."); return; }
    setManualMsg("");
    setStatus("saving");
    const ok = await saveScan(manual);
    if (!ok) { setStatus("idle"); return; }   // form stays filled in
    await onRefresh();
    onDone();
  };

  const setM = (k) => (e) => setManual((f) => ({ ...f, [k]: e.target.value }));
  const setP = (k) => (e) => setPending((p) => ({ ...p, [k]: e.target.value }));

  return (
    <>
      {status !== "confirm" && status !== "reading" && status !== "preparing" && (
        <Segmented T={T} value={mode} onChange={pickMode} options={[["upload", "Scan photo / PDF"], ["manual", "Enter manually"]]} />
      )}

      {mode === "upload" && (
        <>
          <input ref={pickRef} type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={handleFile} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleFile} />

          {(status === "idle" || status === "error") && (
            <>
              <div style={{ border: `1.5px dashed ${T.accent400}`, borderRadius: 18, background: T.accent100, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 44, height: 44, borderRadius: 14, background: T.accent, color: T.accentInk, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                    <Icon name="scan" size={22} stroke={2} />
                  </span>
                  <div style={{ fontSize: 13, color: T.n700, lineHeight: 1.5 }}>
                    Photograph the printed result sheet or upload its PDF. The numbers are read for you, and you check them before anything is saved.
                  </div>
                </div>
                <FormGrid>
                  <Btn T={T} icon="camera" onClick={() => cameraRef.current?.click()}>Take photo</Btn>
                  <Btn T={T} kind="ghost" icon="upload" onClick={() => pickRef.current?.click()}>Choose file</Btn>
                </FormGrid>
              </div>
              <Muted T={T}>For a clean read: lay the sheet flat, fill the frame with the whole page, good light, no glare.</Muted>
              {status === "error" && (
                <Banner T={T} tone="bad" action={null}>
                  {errorMsg}
                  <div style={{ marginTop: 6 }}>
                    <button type="button" onClick={() => pickMode("manual")} style={{ background: "none", border: "none", padding: 0, color: T.accent, fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>
                      Enter the numbers manually instead
                    </button>
                  </div>
                </Banner>
              )}
            </>
          )}

          {(status === "preparing" || status === "reading") && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "28px 0" }}>
              <Spinner T={T} />
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{status === "preparing" ? "Preparing the image…" : "Reading your scan…"}</div>
              <Muted T={T}>{status === "reading" ? "Usually 5–20 seconds." : " "}</Muted>
            </div>
          )}

          {(status === "confirm" || status === "saving") && pending && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.ok, fontSize: 14, fontWeight: 700 }}>
                <Icon name="check" size={18} stroke={2.6} /> Scan read — check the numbers
              </div>
              <FormGrid>
                <Field T={T} label="Date"><Input T={T} type="date" value={pending.date || ""} onChange={setP("date")} /></Field>
                <Field T={T} label="Weight (kg)"><Input T={T} type="number" step="0.1" inputMode="decimal" value={pending.weight ?? ""} onChange={setP("weight")} /></Field>
                <Field T={T} label="Body fat (%)"><Input T={T} type="number" step="0.1" inputMode="decimal" value={pending.body_fat ?? ""} onChange={setP("body_fat")} /></Field>
                <Field T={T} label="Muscle Mass (kg)"><Input T={T} type="number" step="0.1" inputMode="decimal" value={pending.muscle_kg ?? ""} onChange={setP("muscle_kg")} /></Field>
              </FormGrid>
              {notes.length > 0 && (
                <div style={{ background: T.surface2, borderRadius: 12, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
                  {notes.map((n, i) => <div key={i} style={{ fontSize: 12, color: T.n700, lineHeight: 1.5 }}>• {n}</div>)}
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <Btn T={T} full icon="check" onClick={confirmSave} disabled={status === "saving"}>{status === "saving" ? "Saving…" : "Save scan"}</Btn>
                <Btn T={T} kind="ghost" onClick={() => { setPending(null); setStatus("idle"); }}>Retake</Btn>
              </div>
            </>
          )}
        </>
      )}

      {mode === "manual" && (
        <>
          <Muted T={T}>Copy the values from your InBody sheet. Muscle Mass is the Skeletal Muscle Mass (SMM) in kg, as printed.</Muted>
          <FormGrid>
            <Field T={T} label="Date"><Input T={T} type="date" value={manual.date} onChange={setM("date")} /></Field>
            <Field T={T} label="Weight (kg)"><Input T={T} type="number" step="0.1" inputMode="decimal" placeholder="e.g. 84.0" value={manual.weight} onChange={setM("weight")} /></Field>
            <Field T={T} label="Body fat (%)"><Input T={T} type="number" step="0.1" inputMode="decimal" placeholder="PBF, e.g. 22.0" value={manual.body_fat} onChange={setM("body_fat")} /></Field>
            <Field T={T} label="Muscle Mass (kg)">
              <Input T={T} type="number" step="0.1" inputMode="decimal" placeholder="SMM, e.g. 37.9" value={manual.muscle_kg} onChange={setM("muscle_kg")} />
            </Field>
          </FormGrid>
          {manualMsg && <div style={{ fontSize: 12.5, color: T.bad }}>{manualMsg}</div>}
          <Btn T={T} full icon="check" onClick={saveManual} disabled={status === "saving"}>{status === "saving" ? "Saving…" : "Save scan"}</Btn>
        </>
      )}
    </>
  );
}

// ─── SESSION ─────────────────────────────────────────────────────────────────
export function SessionForm({ T, userId, onRefresh, onDone }) {
  const [form, setForm] = useState({ date: todayISO(), duration_min: "", day_kcal: "", muscles: [] });
  const [saving, setSaving] = useState(false);

  const toggleMuscle = (m) => setForm((f) => ({
    ...f, muscles: f.muscles.includes(m) ? f.muscles.filter((x) => x !== m) : [...f.muscles, m],
  }));

  const save = async () => {
    if (!form.date) return;
    setSaving(true);
    // Keep the muscles in list order, whatever order they were tapped in
    const muscles = SESSION_MUSCLES.filter((m) => form.muscles.includes(m));
    const { error } = await sb.insert("sessions", {
      user_id: userId,
      date: form.date,
      duration_min: form.duration_min ? +form.duration_min : null,
      // Whole-day total (Apple Watch active + resting), not the workout alone
      day_kcal: form.day_kcal ? Math.round(+form.day_kcal) : null,
      muscles: muscles.join(", "),
    });
    if (error) { setSaving(false); return; }   // keep the form so nothing is lost
    await onRefresh();
    setSaving(false);
    onDone();
  };

  return (
    <>
      <Field T={T} label="Muscles trained">
        <Chips T={T} multi options={SESSION_MUSCLES} value={form.muscles} onChange={toggleMuscle} />
      </Field>
      <FormGrid>
        <Field T={T} label="Duration (min)"><Input T={T} type="number" inputMode="numeric" placeholder="e.g. 58" value={form.duration_min} onChange={(e) => setForm((f) => ({ ...f, duration_min: e.target.value }))} /></Field>
        <Field T={T} label="Burned today (kcal)"><Input T={T} type="number" inputMode="numeric" placeholder="e.g. 2850" value={form.day_kcal} onChange={(e) => setForm((f) => ({ ...f, day_kcal: e.target.value }))} /></Field>
        <Field T={T} label="Date" span><Input T={T} type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></Field>
      </FormGrid>
      <Btn T={T} full icon="check" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save session"}</Btn>
      <Muted T={T}>
        "Burned today" is your whole day, not just the workout: on iPhone open Fitness → Activity and add Active + Resting energy (or Health → Browse → Activity). Log it at the end of the day for the most accurate number.
      </Muted>
    </>
  );
}

// ─── EXERCISE SET ────────────────────────────────────────────────────────────
export function SetForm({ T, data, userId, onRefresh, onDone, initialMuscle }) {
  const muscles = workoutMuscleTabs(data.logs);
  const [muscle, setMuscle] = useState(initialMuscle && muscles.includes(initialMuscle) ? initialMuscle : "Chest");
  const [form, setForm] = useState({ exercise: "", weight_kg: "", reps: "", date: todayISO() });
  const [saving, setSaving] = useState(false);
  const [logged, setLogged] = useState([]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const names = exerciseNames(data.logs, muscle).slice(0, 8);
  const hist = exerciseHistory(data.logs, form.exercise, form.date);

  const add = async () => {
    if (!form.exercise || !form.weight_kg || !form.reps || !form.date) return;
    setSaving(true);
    const row = { user_id: userId, muscle_group: muscle, exercise: form.exercise.trim(), weight_kg: +form.weight_kg, reps: +form.reps, date: form.date };
    const { error } = await sb.insert("workout_logs", row);
    if (error) { setSaving(false); return; }
    setLogged((l) => [...l, row]);
    // Next set is usually the same exercise and load: keep them, clear reps.
    setForm((f) => ({ ...f, reps: "" }));
    await onRefresh();
    setSaving(false);
  };

  const fill = (s) => setForm((f) => ({ ...f, weight_kg: String(s.weight_kg), reps: String(s.reps) }));

  return (
    <>
      <Field T={T} label="Muscle group">
        <Chips T={T} scroll options={muscles} value={muscle} onChange={(m) => { setMuscle(m); setForm((f) => ({ ...f, exercise: "" })); }} />
      </Field>
      <Field T={T} label="Exercise">
        <Input T={T} placeholder="e.g. Bench press" value={form.exercise} onChange={set("exercise")} />
      </Field>
      {names.length > 0 && (
        <Chips T={T} scroll options={names} value={form.exercise.trim().toLowerCase() === "" ? null : names.find((n) => n.toLowerCase() === form.exercise.trim().toLowerCase())} onChange={(n) => setForm((f) => ({ ...f, exercise: n }))} />
      )}

      {hist && (hist.last.length > 0 || hist.best) && (
        <div style={{ background: T.surface2, borderRadius: 14, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
          {hist.last.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Kicker T={T}>Last · {fmt(hist.lastDate)}</Kicker>
              {hist.last.map((s, i) => (
                <button key={i} type="button" onClick={() => fill(s)} className="g-press" style={{ border: `1px solid ${T.divider}`, background: T.surface, color: T.text, borderRadius: 9, padding: "5px 9px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontVariantNumeric: "tabular-nums" }}>
                  {s.weight_kg}×{s.reps}
                </button>
              ))}
            </div>
          )}
          {hist.best && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 12.5, color: T.n700, lineHeight: 1.45 }}>
              <span style={{ color: T.warn, marginTop: 1 }}><Icon name="trophy" size={15} /></span>
              <span>Best: <strong style={{ color: T.text }}>{hist.best.weight_kg} kg × {hist.best.reps}</strong> ({fmt(hist.best.date)}){hist.last.length > 0 ? " · tap a set to reuse it" : ""}</span>
            </div>
          )}
        </div>
      )}

      <FormGrid>
        <Field T={T} label="Weight (kg)"><Input T={T} type="number" step="0.5" inputMode="decimal" placeholder="e.g. 70" value={form.weight_kg} onChange={set("weight_kg")} /></Field>
        <Field T={T} label="Reps"><Input T={T} type="number" inputMode="numeric" placeholder="e.g. 8" value={form.reps} onChange={set("reps")} /></Field>
        <Field T={T} label="Date" span><Input T={T} type="date" value={form.date} onChange={set("date")} /></Field>
      </FormGrid>
      <Btn T={T} full icon="plus" onClick={add} disabled={saving || !form.exercise || !form.weight_kg || !form.reps}>{saving ? "Saving…" : "Log set"}</Btn>

      {logged.length > 0 && (
        <Card T={T} pad={12} style={{ gap: 6 }}>
          <Kicker T={T}>Logged just now</Kicker>
          {logged.map((l, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, color: T.text }}>
              <span>{l.exercise} <span style={{ color: T.n600 }}>· {l.muscle_group}</span></span>
              <strong style={{ fontVariantNumeric: "tabular-nums" }}>{l.weight_kg} kg × {l.reps}</strong>
            </div>
          ))}
          <Btn T={T} kind="secondary" small onClick={onDone} style={{ marginTop: 6 }}>Done</Btn>
        </Card>
      )}
    </>
  );
}

// ─── MEASUREMENTS ────────────────────────────────────────────────────────────
export function MeasureForm({ T, data, userId, onRefresh, onDone }) {
  const [form, setForm] = useState({ date: todayISO(), waist: "", chest: "", hips: "", arms: "", thighs: "" });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const last = [...(data.measurements || [])].sort((a, b) => (a.date < b.date ? 1 : -1))[0];

  const add = async () => {
    if (!form.date) return;
    setSaving(true);
    const { error } = await sb.insert("measurements", { user_id: userId, date: form.date, waist: +form.waist || 0, chest: +form.chest || 0, hips: +form.hips || 0, arms: +form.arms || 0, thighs: +form.thighs || 0 });
    if (error) { setSaving(false); return; }
    await onRefresh();
    setSaving(false);
    onDone();
  };

  const fields = [["waist", "Waist", 93], ["chest", "Chest", 108], ["hips", "Hips", 101], ["arms", "Arms", 37], ["thighs", "Thighs", 58]];

  return (
    <>
      <Muted T={T}>All in cm. Measure at the same spots each time, relaxed, tape snug but not tight.</Muted>
      <FormGrid>
        <Field T={T} label="Date"><Input T={T} type="date" value={form.date} onChange={set("date")} /></Field>
        {fields.map(([k, label, eg]) => (
          <Field key={k} T={T} label={label} hint={last?.[k] ? `Last: ${last[k]} cm` : null}>
            <Input T={T} type="number" step="0.1" inputMode="decimal" placeholder={`e.g. ${eg}`} value={form[k]} onChange={set(k)} />
          </Field>
        ))}
      </FormGrid>
      <Btn T={T} full icon="check" onClick={add} disabled={saving}>{saving ? "Saving…" : "Save measurements"}</Btn>
    </>
  );
}
