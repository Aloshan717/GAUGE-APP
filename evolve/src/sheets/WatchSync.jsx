// Apple Watch auto-sync — the simplest Shortcut that works:
//   Find Health Samples (Active Energy, today) → Calculate Statistics (Sum) →
//   Get Contents of URL (your link + the Statistics number at the end).
// Resting energy is your resting metabolic rate, which Evolve already knows
// from your InBody / profile, so it is built into the link.
import React, { useEffect, useState } from "react";
import { useApp } from "../ctx.js";
import { Icon, Note } from "../ui.jsx";
import { sha256Hex, newSyncKey, store } from "../lib/api.js";
import { fmtDate, fmtNum } from "../lib/i18n.js";
import { localISO, addDays } from "../lib/body.js";

function Step({ n, title, children, dim }) {
  return (
    <div className="card tight" style={{ opacity: dim ? 0.55 : 1 }}>
      <div className="row" style={{ gap: 10 }}>
        <span style={{ width: 30, height: 30, borderRadius: 15, background: "var(--accent)", color: "var(--ink)", display: "grid", placeItems: "center", fontWeight: 800, flex: "none" }}>{n}</span>
        <span className="strong" style={{ fontSize: 15 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

export default function WatchSync() {
  const { t, lang, user, data, derived, saveProfile, refresh, openSheet } = useApp();
  const keyStore = `evolve_sync_key_${user?.id}`;
  const [key, setKey] = useState(() => store.get(keyStore) || "");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [checked, setChecked] = useState(false);
  const resting = derived.maint?.bmr?.kcal || null;
  const link = key && resting ? `${location.origin}/api/burn?key=${key}&resting=${resting}&active=` : "";
  const lastWatch = (data.days || []).filter((d) => d.burn_source === "watch" && d.burn_kcal).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const savedHash = data.profile?.sync_key_hash || null;
  // Is the link on this phone the one the server knows? (Only its hash is stored.)
  const [keyOk, setKeyOk] = useState(null);
  useEffect(() => {
    let on = true;
    if (!key || !savedHash) { setKeyOk(null); return undefined; }
    sha256Hex(key).then((h) => { if (on) setKeyOk(h === savedHash); });
    return () => { on = false; };
  }, [key, savedHash]);

  const make = async () => {
    // A new link stops the old one — easy to break a working Shortcut by accident.
    if (savedHash && !window.confirm(t("wsNewKeyQ"))) return;
    setBusy(true);
    const k = newSyncKey();
    const r = await saveProfile({ sync_key_hash: await sha256Hex(k) });
    setBusy(false);
    if (r.error) return;
    store.set(keyStore, k);
    setKey(k);
  };
  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* blocked */ } };
  const check = async () => { await refresh(); setChecked(true); };
  const S = (i) => (Array.isArray(t("ws2")) ? t("ws2")[i] : ["", ""]);
  const body = (i) => <div className="body" style={{ color: "var(--text2)", whiteSpace: "pre-line" }}>{S(i)[1]}</div>;

  if (!resting) {
    return (
      <>
        <Note kind="warn" icon="info">{t("wsNeedBmr")}</Note>
        <button className="btn primary" onClick={() => openSheet("profile", { fromAccount: true })}>{t("addProfile")}</button>
      </>
    );
  }

  return (
    <>
      <div className="body sub">{t("ws2Intro")}</div>
      {lastWatch && (lastWatch.date < addDays(localISO(), -1)
        ? <Note kind="warn" icon="info">{t("autoStale", { date: fmtDate(lastWatch.date, lang) })}</Note>
        : <Note>{t("autoOn", { date: fmtDate(lastWatch.date, lang) })} · {fmtNum(lastWatch.burn_kcal)} {t("kcal")}</Note>)}

      <Step n={1} title={S(0)[0]}>
        {body(0)}
        {savedHash && !key && <Note kind="warn" icon="info">{t("wsNoLocalKey")}</Note>}
        {lastWatch && resting && lastWatch.burn_kcal - resting < 25 && <Note kind="warn" icon="info">{t("wsNoActive", { k: fmtNum(lastWatch.burn_kcal) })}</Note>}
        {keyOk === false && <Note kind="warn" icon="info">{t("wsKeyOld")}</Note>}
        {key ? (
          <>
            <button className="btn primary lg" onClick={copy}><Icon name="copy" size={18} />{copied ? t("copied") : t("wsCopy")}</button>
            <div className="small muted">{t("wsKeyEnds", { k: key.slice(-4) })}</div>
            <button className="link" onClick={make} disabled={busy}>{t("newKey")}</button>
          </>
        ) : (
          <button className="btn primary lg" onClick={make} disabled={busy}>{busy ? t("saving") : t("wsMake")}</button>
        )}
      </Step>
      <Step n={2} title={S(1)[0]} dim={!key}>{body(1)}</Step>
      <Step n={3} title={S(2)[0]} dim={!key}>{body(2)}</Step>
      <Step n={4} title={S(3)[0]} dim={!key}>{body(3)}</Step>
      <Step n={5} title={S(4)[0]} dim={!key}>
        {body(4)}
        <button className="btn soft" onClick={check}>{t("wsCheck")}</button>
        {checked && (lastWatch ? <div className="okmsg">{t("autoOn", { date: fmtDate(lastWatch.date, lang) })} · {fmtNum(lastWatch.burn_kcal)} {t("kcal")}</div> : <div className="err">{t("wsNotYet")}</div>)}
      </Step>
      <Step n={6} title={S(5)[0]} dim={!lastWatch}>{body(5)}</Step>
      <div className="small muted">{t("wsRestNote", { r: fmtNum(resting) })}</div>
      <Note kind="plain" icon="lock">{t("syncPrivacy")}</Note>
    </>
  );
}
