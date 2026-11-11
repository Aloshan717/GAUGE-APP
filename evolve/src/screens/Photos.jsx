// Progress photos: front, side and back by date, compared side by side with the
// weight and body fat of that time. They stay on this phone only.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../ctx.js";
import { Icon, Seg, Note } from "../ui.jsx";
import { fmtDate, fmtNum, signed } from "../lib/i18n.js";
import { localISO } from "../lib/body.js";
import { mergeWeightSeries, coerceNumber } from "../lib/core.js";
import { ANGLES, listPhotos, savePhoto, deletePhotos, byDate, shrinkToBlob } from "../lib/photos.js";

function BlobImg({ blob, alt = "" }) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return url ? <img src={url} alt={alt} /> : null;
}

const ts = (d) => new Date(`${d}T12:00:00`).getTime();
// The reading nearest a date (within `days`), or null.
function nearest(points, date, field, days) {
  let best = null, gap = Infinity;
  for (const p of points) {
    const v = coerceNumber(p[field]);
    if (v == null) continue;
    const g = Math.abs(ts(p.date) - ts(date)) / 86400000;
    if (g <= days && g < gap) { best = { v, date: p.date }; gap = g; }
  }
  return best;
}

export default function PhotosTab() {
  const { t, lang, user, data, toast } = useApp();
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(null);
  const [angle, setAngle] = useState("front");
  const [pick, setPick] = useState({ a: null, b: null });
  const [armed, setArmed] = useState(null);
  const [failed, setFailed] = useState(false);
  const today = localISO();
  const load = useCallback(async () => {
    try { setList(await listPhotos(user.id)); } catch { setFailed(true); setList([]); }
  }, [user.id]);
  useEffect(() => { load(); }, [load]);

  const groups = byDate(list || []);
  const todayG = groups.find((g) => g.date === today) || { date: today };
  const take = async (ang, file) => {
    if (!file) return;
    setBusy(ang);
    try { await savePhoto({ uid: user.id, date: today, angle: ang, blob: await shrinkToBlob(file) }); await load(); toast(t("photoSaved")); } catch { toast(t("photoFail")); }
    setBusy(null);
  };
  const remove = async (date) => { await deletePhotos(user.id, date); setArmed(null); await load(); };

  const weights = useMemo(() => mergeWeightSeries(data.weights, data.inbody), [data.weights, data.inbody]);
  const withAngle = groups.filter((g) => g[angle]);
  const a = withAngle.find((g) => g.date === pick.a) || withAngle[withAngle.length - 1];   // oldest
  const b = withAngle.find((g) => g.date === pick.b) || withAngle[0];                        // newest
  const facts = (g) => ({ w: nearest(weights, g.date, "weight", 7), f: nearest(data.inbody || [], g.date, "body_fat", 21) });
  const name = (ang) => t(`ph_${ang}`);

  if (failed) return <Note kind="warn" icon="info">{t("photosNoStore")}</Note>;
  return (
    <>
      <div className="card">
        <div className="row between">
          <span className="card-title">{t("photosToday")}</span>
          <span className="small muted">{fmtDate(today, lang)}</span>
        </div>
        <div className="photo-slots">
          {ANGLES.map((ang) => (
            <label key={ang} className={`photo-slot${todayG[ang] ? " has" : ""}`}>
              {todayG[ang] ? <BlobImg blob={todayG[ang].blob} alt={name(ang)} /> : <Icon name="camera" size={26} />}
              <span className="cap">{busy === ang ? t("saving") : todayG[ang] ? `${name(ang)} · ${t("retake")}` : name(ang)}</span>
              <input type="file" accept="image/*" hidden onChange={(e) => { take(ang, e.target.files?.[0]); e.target.value = ""; }} />
            </label>
          ))}
        </div>
        <div className="small muted">{t("photosTip")}</div>
      </div>

      {withAngle.length >= 2 && (
        <div className="card">
          <div className="card-title">{t("photosCompare")}</div>
          <Seg options={ANGLES.map((x) => [x, name(x)])} value={angle} onChange={(v) => { setAngle(v); setPick({ a: null, b: null }); }} label={t("photosCompare")} />
          <div className="compare">
            {[["a", a], ["b", b]].map(([k, g]) => {
              const f = facts(g);
              return (
                <div key={k} className="col" style={{ gap: 6 }}>
                  <div className="photo-big"><BlobImg blob={g[angle].blob} alt={`${name(angle)} ${g.date}`} /></div>
                  <select className="input" value={g.date} onChange={(e) => setPick((p) => ({ ...p, [k]: e.target.value }))} aria-label={t("photosPickDate")} style={{ minHeight: 40 }}>
                    {withAngle.map((x) => <option key={x.date} value={x.date}>{fmtDate(x.date, lang, "long")}</option>)}
                  </select>
                  <span className="small muted center">{f.w ? `${fmtNum(f.w.v, 1)} ${t("kg")}` : "—"}{f.f ? ` · ${fmtNum(f.f.v, 1)}%` : ""}</span>
                </div>
              );
            })}
          </div>
          {(() => {
            const fa = facts(a), fb = facts(b);
            const parts = [];
            if (fa.w && fb.w) parts.push(`${signed(fb.w.v - fa.w.v)} ${t("kg")}`);
            if (fa.f && fb.f) parts.push(`${signed(fb.f.v - fa.f.v)}% ${t("fatWord")}`);
            const days = Math.round((ts(b.date) - ts(a.date)) / 86400000);
            return parts.length && days > 0 ? <div className="small strong center">{t("photosDiff", { d: parts.join(" · "), n: days })}</div> : null;
          })()}
        </div>
      )}

      {groups.length > 0 && (
        <div className="card flat">
          {groups.map((g) => (
            <div key={g.date} className="list-row">
              <div className="col" style={{ gap: 6 }}>
                <span className="strong">{fmtDate(g.date, lang, "long")}</span>
                <div className="row" style={{ gap: 6 }}>
                  {ANGLES.map((ang) => <div key={ang} className="photo-thumb">{g[ang] ? <BlobImg blob={g[ang].blob} alt={name(ang)} /> : null}</div>)}
                </div>
              </div>
              {armed === g.date
                ? <button className="btn danger sm" onClick={() => remove(g.date)} onBlur={() => setArmed(null)} autoFocus>{t("delQ")}</button>
                : <button className="del" aria-label={`${t("del")} ${g.date}`} onClick={() => setArmed(g.date)}><Icon name="trash" size={17} /></button>}
            </div>
          ))}
        </div>
      )}
      <Note kind="plain" icon="lock">{t("photosPrivate")}</Note>
    </>
  );
}
