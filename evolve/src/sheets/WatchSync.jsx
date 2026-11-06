// Apple Watch auto-sync: a personal link + a free Shortcuts automation, step by step.
import React, { useState } from "react";
import { useApp } from "../ctx.js";
import { Icon, Note } from "../ui.jsx";
import { sha256Hex, newSyncKey, store } from "../lib/api.js";
import { fmtDate } from "../lib/i18n.js";

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
  const { t, lang, user, data, saveProfile, refresh } = useApp();
  const keyStore = `evolve_sync_key_${user?.id}`;
  const [key, setKey] = useState(() => store.get(keyStore) || "");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [checked, setChecked] = useState(false);
  const link = key ? `${location.origin}/api/burn?key=${key}` : "";
  const lastWatch = (data.days || []).filter((d) => d.burn_source === "watch" && d.burn_kcal).sort((a, b) => (a.date < b.date ? 1 : -1))[0];

  const make = async () => {
    setBusy(true);
    const k = newSyncKey();
    const r = await saveProfile({ sync_key_hash: await sha256Hex(k) });
    setBusy(false);
    if (r.error) return;
    store.set(keyStore, k);   // kept on this phone so you can copy it again while setting up
    setKey(k);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* blocked */ }
  };
  const check = async () => { await refresh(); setChecked(true); };
  const steps = t("ws");
  const S = (i) => (Array.isArray(steps) ? steps[i] : ["", ""]);
  const CopyBtn = () => (
    <button className="btn primary" onClick={copy} disabled={!key}><Icon name="copy" size={18} />{copied ? t("copied") : t("wsCopy")}</button>
  );

  return (
    <>
      <div className="body sub">{t("wsIntro")}</div>
      {lastWatch && <Note>{t("autoOn", { date: fmtDate(lastWatch.date, lang) })} · {lastWatch.burn_kcal} {t("kcal")}</Note>}

      <Step n={1} title={S(0)[0]}>
        <div className="small sub">{S(0)[1]}</div>
        {key ? (
          <>
            <code className="key">{link}</code>
            <CopyBtn />
            <button className="link" onClick={make} disabled={busy}>{t("newKey")}</button>
          </>
        ) : (
          <button className="btn primary" onClick={make} disabled={busy}>{busy ? t("saving") : t("makeKey")}</button>
        )}
      </Step>
      {[1, 2, 3, 4].map((i) => (
        <Step key={i} n={i + 1} title={S(i)[0]} dim={!key}><div className="body" style={{ color: "var(--text2)" }}>{S(i)[1]}</div></Step>
      ))}
      <Step n={6} title={S(5)[0]} dim={!key}>
        <div className="body" style={{ color: "var(--text2)" }}>{S(5)[1]}</div>
        <CopyBtn />
      </Step>
      <Step n={7} title={S(6)[0]} dim={!key}>
        <div className="body" style={{ color: "var(--text2)" }}>{S(6)[1]}</div>
        <button className="btn soft" onClick={check}>{t("wsCheck")}</button>
        {checked && (lastWatch ? <div className="okmsg">{t("autoOn", { date: fmtDate(lastWatch.date, lang) })}</div> : <div className="err">{t("wsNotYet")}</div>)}
      </Step>
      <Note kind="plain" icon="lock">{t("syncPrivacy")}</Note>
    </>
  );
}
