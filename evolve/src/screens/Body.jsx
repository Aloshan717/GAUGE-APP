// Body: weigh-ins, InBody scans and tape measurements — history, charts, delete.
import React, { useState } from "react";
import { useApp } from "../ctx.js";
import { Icon, Seg, Spark, Empty } from "../ui.jsx";
import { fmtDate, fmtNum, signed } from "../lib/i18n.js";
import { sb, store } from "../lib/api.js";
import { coerceNumber, mergeWeightSeries, withMuscleKg, weightTrend } from "../lib/core.js";
import PhotosTab from "./Photos.jsx";

const ts = (d) => new Date(d + "T00:00:00").getTime();

function DeleteBtn({ onDelete, label }) {
  const { t } = useApp();
  const [armed, setArmed] = useState(false);
  if (armed) return <button className="btn danger sm" onClick={async () => { await onDelete(); setArmed(false); }} onBlur={() => setArmed(false)} autoFocus>{t("delQ")}</button>;
  return <button className="del" aria-label={`${t("del")} ${label}`} onClick={() => setArmed(true)}><Icon name="trash" size={17} /></button>;
}

function ShowMore({ list, limit = 8, render }) {
  const [all, setAll] = useState(false);
  const shown = all ? list : list.slice(0, limit);
  return (
    <>
      {shown.map(render)}
      {list.length > limit && !all && <button className="link" onClick={() => setAll(true)}>+ {list.length - limit}</button>}
    </>
  );
}

function WeightTab() {
  const { t, lang, data, refresh, openSheet } = useApp();
  const series = mergeWeightSeries(data.weights, data.inbody);
  if (!series.length) {
    return <div className="card"><Empty icon="scale" title={t("noWeights")} text={t("noWeightsText")} action={<button className="btn primary" onClick={() => openSheet("weigh")}>{t("addWeigh")}</button>} /></div>;
  }
  const latest = series[series.length - 1];
  const trend = weightTrend(series, Date.now(), 28);
  const target = coerceNumber(data.goal?.target_weight);
  const pts = series.filter((p) => ts(p.date) >= Date.now() - 120 * 86400000).map((p) => ({ t: ts(p.date), v: p.weight, date: p.date, kind: p.source === "scan" ? "scan" : "manual" }));
  const history = [...series].reverse();
  return (
    <>
      <div className="card">
        <div className="row between">
          <span className="small strong sub">{t("currentWeight")}</span>
          <button className="btn soft sm" onClick={() => openSheet("weigh")}>{t("addWeigh")}</button>
        </div>
        <div><span className="num" style={{ fontSize: 52, lineHeight: 1 }}>{fmtNum(latest.weight, 2)}</span> <span className="muted strong">{t("kg")}</span></div>
        {trend && <div className="small muted">{t("trendLine", { r: signed(trend.kgPerWeek, 2) })}{target != null ? ` · ${t("targetTxt", { v: `${fmtNum(target, 1)} ${t("kg")}` })}` : ""}</div>}
        {pts.length >= 2 && <Spark points={pts} target={target} height={120} dates unit={t("kg")} digits={2} label={t("segWeight")} />}
      </div>
      <div className="card flat">
        <ShowMore list={history} render={(w, i) => {
          const prev = history[i + 1];
          const d = prev ? +(w.weight - prev.weight).toFixed(2) : null;
          const goodDown = target == null || target < w.weight;
          return (
            <div className="list-row" key={`${w.date}-${w.source}`}>
              <div>
                <div className="strong">{fmtNum(w.weight, 2)} {t("kg")}</div>
                <div className="small muted">{fmtDate(w.date, lang)}{w.source === "scan" ? ` · ${t("fromScan")}` : ""}</div>
              </div>
              <div className="row" style={{ gap: 4 }}>
                {d != null && d !== 0 && <span className="small strong" style={{ color: (d < 0) === goodDown ? "var(--ok)" : "var(--bad)" }}>{d < 0 ? "▼" : "▲"} {fmtNum(Math.abs(d), 2)}</span>}
                {w.source === "manual" && w.id && <DeleteBtn label={fmtDate(w.date, lang)} onDelete={async () => { await sb.delete("weight_entries", w.id); await refresh(); }} />}
              </div>
            </div>
          );
        }} />
      </div>
    </>
  );
}

function InbodyTab() {
  const { t, lang, data, refresh, openSheet } = useApp();
  const scans = withMuscleKg(data.inbody).filter((s) => s.date).sort((a, b) => (a.date < b.date ? 1 : -1));
  if (!scans.length) {
    return <div className="card"><Empty icon="body" title={t("noScans")} text={t("noScansText")} action={<button className="btn primary" onClick={() => openSheet("scan")}>{t("addScan")}</button>} /></div>;
  }
  const L = scans[0], P = scans[1];
  const delta = (k) => (P && coerceNumber(L[k]) != null && coerceNumber(P[k]) != null ? +(coerceNumber(L[k]) - coerceNumber(P[k])).toFixed(1) : null);
  const tiles = [
    ["weight", t("mWeight"), fmtNum(L.weight, 2), "var(--accent)", null],
    ["body_fat", t("mFat"), L.body_fat != null ? `${fmtNum(L.body_fat, 1)}%` : "—", "var(--fat)", -1],
    ["muscle_kg", t("mMuscle"), L.muscle_kg != null ? fmtNum(L.muscle_kg, 1) : "—", "var(--muscle)", 1],
  ];
  return (
    <>
      <div className="card">
        <div className="row between small"><span className="strong sub">{t("latestScan")}</span><span className="muted">{fmtDate(L.date, lang)}</span></div>
        <div className="grid3">
          {tiles.map(([k, label, v, color, good]) => {
            const d = delta(k);
            return (
              <div className="box" key={k} style={{ borderTop: `2px solid ${color}`, padding: "10px 11px" }}>
                <div className="muted strong" style={{ fontSize: 11 }}>{label}</div>
                <div className="num" style={{ fontSize: 24 }}>{v}</div>
                {d != null && <div className="small strong" style={{ color: good == null || d === 0 ? "var(--sub)" : Math.sign(d) === good ? "var(--ok)" : "var(--bad)" }}>{d < 0 ? "▼" : d > 0 ? "▲" : "="} {fmtNum(Math.abs(d), 1)}</div>}
              </div>
            );
          })}
        </div>
        <button className="btn primary" onClick={() => openSheet("scan")}>{t("addScan")}</button>
      </div>
      <div className="card flat">
        <ShowMore list={scans} render={(s) => (
          <div className="list-row" key={s.id || s.date}>
            <div className="grow">
              <div className="strong">{fmtDate(s.date, lang, "long")}</div>
              <div className="small muted">
                {fmtNum(s.weight, 2)} {t("kg")}{s.body_fat != null ? ` · ${fmtNum(s.body_fat, 1)}% ${t("fatShort")}` : ""}{s.muscle_kg != null ? ` · ${fmtNum(s.muscle_kg, 1)} ${t("kg")} ${t("muscleShort")}` : ""}
              </div>
            </div>
            {s.id && <DeleteBtn label={fmtDate(s.date, lang)} onDelete={async () => { await sb.delete("inbody_scans", s.id); await refresh(); }} />}
          </div>
        )} />
      </div>
    </>
  );
}

function MeasureTab() {
  const { t, lang, data, refresh, openSheet } = useApp();
  const rows = [...(data.measurements || [])].filter((m) => m.date).sort((a, b) => (a.date < b.date ? 1 : -1));
  if (!rows.length) {
    return <div className="card"><Empty icon="ruler" title={t("noMeasures")} text={t("noMeasuresText")} action={<button className="btn primary" onClick={() => openSheet("measure")}>{t("addMeasure")}</button>} /></div>;
  }
  const L = rows[0];
  const keys = ["waist", "chest", "hips", "arms", "thighs"];
  const prevOf = (k) => rows.slice(1).find((r) => coerceNumber(r[k]) > 0);
  return (
    <>
      <div className="card flat">
        <div className="list-row"><span className="small strong sub">{fmtDate(L.date, lang, "long")}</span><button className="btn soft sm" onClick={() => openSheet("measure")}>{t("addMeasure")}</button></div>
        {keys.filter((k) => coerceNumber(L[k]) > 0).map((k) => {
          const p = prevOf(k);
          const d = p ? +(coerceNumber(L[k]) - coerceNumber(p[k])).toFixed(1) : null;
          const goodDown = k === "waist" || k === "hips";
          return (
            <div className="list-row" key={k}>
              <span className="strong">{t(k)}</span>
              <span className="small sub">{fmtNum(L[k], 1)} {t("cm")} {d != null && d !== 0 && <b style={{ color: (d < 0) === goodDown ? "var(--ok)" : "var(--sub)" }}>{d < 0 ? "▼" : "▲"} {fmtNum(Math.abs(d), 1)}</b>}</span>
            </div>
          );
        })}
      </div>
      <div className="card flat">
        <ShowMore list={rows} render={(m) => (
          <div className="list-row" key={m.id || m.date}>
            <div className="grow">
              <div className="strong">{fmtDate(m.date, lang, "long")}</div>
              <div className="small muted">{keys.filter((k) => coerceNumber(m[k]) > 0).map((k) => `${t(k)} ${fmtNum(m[k], 1)}`).join(" · ")}</div>
            </div>
            {m.id && <DeleteBtn label={fmtDate(m.date, lang)} onDelete={async () => { await sb.delete("measurements", m.id); await refresh(); }} />}
          </div>
        )} />
      </div>
    </>
  );
}

export default function Body() {
  const { t } = useApp();
  const [seg, setSeg] = useState(() => store.get("evolve_body_seg") || "weight");
  const pick = (s) => { setSeg(s); store.set("evolve_body_seg", s); };
  return (
    <>
      <div className="screen-head"><div className="sub">{t("bodySub")}</div><h1>{t("bodyTitle")}</h1></div>
      <Seg options={[["weight", t("segWeight")], ["inbody", t("segInbody")], ["measure", t("segMeasure")], ["photos", t("segPhotos")]]} value={seg} onChange={pick} label={t("bodyTitle")} />
      {seg === "weight" && <WeightTab />}
      {seg === "inbody" && <InbodyTab />}
      {seg === "measure" && <MeasureTab />}
      {seg === "photos" && <PhotosTab />}
    </>
  );
}
