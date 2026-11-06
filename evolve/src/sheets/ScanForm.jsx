// InBody scan: photo/PDF read by /api/scan, checked by you, then saved. Or typed in.
import React, { useRef, useState } from "react";
import { useApp } from "../ctx.js";
import { Field, Icon, Note } from "../ui.jsx";
import { sb, auth } from "../lib/api.js";
import { prepareScanFile } from "../lib/scanClient.js";
import { parseScanReading, musclePercent, coerceNumber } from "../lib/core.js";
import { localISO } from "../lib/body.js";

export default function ScanForm() {
  const { t, lang, user, refresh, closeSheet, toast } = useApp();
  const [status, setStatus] = useState("idle"); // idle | reading | confirm | saving
  const [err, setErr] = useState("");
  const [form, setForm] = useState(null);       // null until read or "type it in"
  const [notes, setNotes] = useState([]);
  const [fromRead, setFromRead] = useState(false);
  const pickRef = useRef(), camRef = useRef();

  const readFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr(""); setStatus("reading");
    try {
      const payload = await prepareScanFile(file);
      const token = await auth.validToken();
      let res;
      try {
        res = await fetch("/api/scan", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload) });
      } catch { throw new Error(t("noNet")); }
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.reading) {
        const s = res.status;
        const msg = s === 401 ? t("scanErr401") : s === 413 ? t("scanErr413") : s === 429 ? t("scanErr429")
          : s === 500 && /ANTHROPIC/i.test(body?.error || "") ? t("scanErrKey") : s >= 500 ? t("scanErr5xx") : body?.error || t("scanErr5xx");
        throw new Error(msg);
      }
      if (body.reading.is_body_composition_report === false) throw new Error(t("notReport"));
      const r = parseScanReading(body.reading, localISO());
      if (!r.ok) throw new Error(lang === "ar" ? t("notReport") : r.error);
      const d = r.data;
      setForm({ date: d.date || localISO(), weight: d.weight ?? "", body_fat: d.body_fat ?? "", muscle_kg: d.muscle_kg ?? "" });
      setNotes(lang === "ar" ? [] : r.notes || []);
      setFromRead(true);
      setStatus("confirm");
    } catch (ex) {
      setErr(ex.message || t("notReport"));
      setStatus("idle");
    }
  };

  const save = async () => {
    const w = coerceNumber(form.weight), kg = coerceNumber(form.muscle_kg), bf = coerceNumber(form.body_fat);
    if (w == null) { setErr(kg != null ? t("scanNeedWeight") : t("scanNeedOne")); return; }
    setErr(""); setStatus("saving");
    const date = form.date || localISO();
    const { error } = await sb.insert("inbody_scans", {
      user_id: user.id, date, weight: w, body_fat: bf,
      muscle_mass: kg != null ? musclePercent(kg, "kg", w) : null,   // % kept for Gauge
      smm_kg: kg,                                                   // the kg printed as "Muscle Mass"
    }, { optional: ["smm_kg"] });
    if (error) { setStatus("confirm"); return; }
    await sb.insert("weight_entries", { user_id: user.id, date, weight: w }, { quiet: true });
    await refresh();
    toast(t("saved"));
    closeSheet();
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (form) {
    return (
      <>
        {fromRead && <Note>{t("readOk")}</Note>}
        <div className="grid2">
          <Field label={t("scanDate")}><input className="input" type="date" value={form.date} max={localISO()} onChange={set("date")} /></Field>
          <Field label={t("scanWeight")}><input className="input" inputMode="decimal" value={form.weight} onChange={set("weight")} placeholder="85.1" /></Field>
          <Field label={t("scanFat")}><input className="input" inputMode="decimal" value={form.body_fat} onChange={set("body_fat")} placeholder="20.6" /></Field>
          <Field label={t("scanMuscle")} hint={t("scanMuscleHint")}><input className="input" inputMode="decimal" value={form.muscle_kg} onChange={set("muscle_kg")} placeholder="64.0" /></Field>
        </div>
        {notes.length > 0 && <div className="box small sub col" style={{ gap: 4 }}>{notes.map((n, i) => <span key={i}>• {n}</span>)}</div>}
        {err && <div className="err" role="alert">{err}</div>}
        <button className="btn primary lg" onClick={save} disabled={status === "saving"}>{status === "saving" ? t("saving") : t("saveScan")}</button>
      </>
    );
  }

  return (
    <>
      <div className="small sub">{t("scanIntro")}</div>
      <input ref={pickRef} type="file" accept="image/*,application/pdf" hidden onChange={readFile} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={readFile} />
      {status === "reading" ? (
        <div className="empty"><span className="ic"><Icon name="body" size={24} /></span><div className="strong">{t("reading")}</div></div>
      ) : (
        <>
          <div className="grid2">
            <button className="btn primary" onClick={() => camRef.current?.click()}><Icon name="camera" size={18} />{t("takePhoto")}</button>
            <button className="btn" onClick={() => pickRef.current?.click()}><Icon name="file" size={18} />{t("chooseFile")}</button>
          </div>
          <button className="btn ghost" onClick={() => setForm({ date: localISO(), weight: "", body_fat: "", muscle_kg: "" })}>{t("typeIt")}</button>
        </>
      )}
      {err && <div className="err" role="alert">{err}</div>}
    </>
  );
}
