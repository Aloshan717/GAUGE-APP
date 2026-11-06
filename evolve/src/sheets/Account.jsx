// Account & settings, profile, invites.
import React, { useEffect, useState } from "react";
import { useApp } from "../ctx.js";
import { Seg, Chips, Field, Icon, Note } from "../ui.jsx";
import { sb } from "../lib/api.js";
import { fmtDate } from "../lib/i18n.js";
import { ageFrom } from "../lib/body.js";
import { coerceNumber } from "../lib/core.js";

function Row({ title, sub, action, onClick, color = "var(--accent-text)" }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className="row between card tight" onClick={onClick} style={{ width: "100%", textAlign: "start", color: "inherit", flexDirection: "row", alignItems: "center", borderRadius: 16 }}>
      <div className="grow"><div className="strong" style={{ fontSize: 14 }}>{title}</div><div className="small muted">{sub}</div></div>
      <span className="small strong" style={{ color, flex: "none" }}>{action}</span>
    </Tag>
  );
}

export function Account() {
  const { t, lang, theme, user, data, changeLang, changeTheme, openSheet, signOutLocal, version } = useApp();
  const [admin, setAdmin] = useState(null);
  useEffect(() => { sb.fn("/api/invite").then((r) => setAdmin(r.ok ? r.body : null)); }, []);
  const p = data.profile || {};
  const name = p.display_name || user?.name || (user?.email || "").split("@")[0];
  const age = ageFrom(p.birth_year);
  const lastWatch = (data.days || []).filter((d) => d.burn_source === "watch" && d.burn_kcal).map((d) => d.date).sort().pop();
  const signOut = async () => { await sb.signOut(); signOutLocal(); };

  return (
    <>
      <div className="row">
        <span className="avatar" style={{ width: 48, height: 48, borderRadius: 24, display: "grid", placeItems: "center", fontSize: 20, background: "var(--accent)", color: "var(--ink)", border: "none" }}>{(name[0] || "E").toUpperCase()}</span>
        <div><div className="strong" style={{ fontSize: 16 }}>{name}</div><div className="small muted ltr">{user?.email}</div></div>
      </div>
      <div className="col"><span className="label">{t("appearance")}</span>
        <Seg options={[["dark", t("dark")], ["light", t("light")]]} value={theme} onChange={changeTheme} label={t("appearance")} />
      </div>
      <div className="col"><span className="label">{t("language")}</span>
        <Seg options={[["en", "English"], ["ar", "العربية"]]} value={lang} onChange={changeLang} label={t("language")} />
      </div>
      <Row title={t("profile")} onClick={() => openSheet("profile", { fromAccount: true })} action={t("edit")}
        sub={p.sex && age && p.height_cm ? t("profileSub", { sex: t(p.sex === "f" ? "female" : "male"), age, h: p.height_cm }) : t("profileEmpty")} />
      <Row title={t("watchRow")} onClick={() => openSheet("sync", { fromAccount: true })} action={t("setUp")}
        sub={lastWatch ? t("watchOn", { date: fmtDate(lastWatch, lang) }) : p.sync_key_hash ? t("watchSet") : t("watchOff")} />
      {admin?.admin && <Row title={t("invite")} sub={t("inviteSub")} action={<Icon name="mail" size={18} />} onClick={() => openSheet("invite", { fromAccount: true })} />}
      <Row title={t("myData")} sub={t("myDataSub")} action={<Icon name="lock" size={16} />} color="var(--muted)" />
      <button className="btn danger" onClick={signOut}>{t("signOut")}</button>
      <div className="small muted center ltr">{t("version", { v: version })}</div>
    </>
  );
}

export function InviteForm() {
  const { t } = useApp();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const send = async () => {
    const e = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { setMsg(["err", t("badEmail")]); return; }
    setBusy(true); setMsg(null);
    const r = await sb.fn("/api/invite", { method: "POST", body: { email: e } });
    setBusy(false);
    if (r.ok) { setMsg(["ok", t("inviteSent", { email: e })]); setEmail(""); }
    else if (r.network) setMsg(["err", t("noNet")]);
    else if (r.status === 409) setMsg(["err", t("inviteExists")]);
    else if (r.status === 501) setMsg(["err", t("inviteOff")]);
    else if (r.status === 403) setMsg(["err", t("inviteNoAdmin")]);
    else setMsg(["err", r.body?.error || t("noNet")]);
  };
  return (
    <>
      <div className="small sub">{t("inviteSub")}</div>
      <Field label={t("inviteEmail")}><input className="input ltr" type="email" inputMode="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      {msg && <div className={msg[0] === "ok" ? "okmsg" : "err"} role="status">{msg[1]}</div>}
      <button className="btn primary lg" onClick={send} disabled={busy || !email}>{busy ? t("sending") : t("sendInvite")}</button>
    </>
  );
}

export function ProfileForm() {
  const { t, data, user, saveProfile, closeSheet, toast, openSheet, sheet } = useApp();
  const p = data.profile || {};
  const [f, setF] = useState({
    display_name: p.display_name || user?.name || "", sex: p.sex || "", age: ageFrom(p.birth_year) ? String(ageFrom(p.birth_year)) : "",
    height: p.height_cm ? String(p.height_cm) : "", activity: p.activity || "sit",
  });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const age = coerceNumber(f.age), h = coerceNumber(f.height);
    setBusy(true);
    const r = await saveProfile({
      display_name: f.display_name.trim() || null, sex: f.sex || null,
      birth_year: age && age > 10 && age < 100 ? new Date().getFullYear() - Math.round(age) : p.birth_year ?? null,
      height_cm: h && h >= 100 && h <= 250 ? h : p.height_cm ?? null, activity: f.activity,
    });
    setBusy(false);
    if (r.error) return;
    toast(t("saved"));
    if (sheet?.fromAccount) openSheet("account"); else closeSheet();
  };
  return (
    <>
      <Field label={t("yourName")}><input className="input" value={f.display_name} onChange={(e) => setF((x) => ({ ...x, display_name: e.target.value }))} /></Field>
      <div className="col"><span className="label">{t("sexQ")}</span>
        <Chips options={[["m", t("male")], ["f", t("female")]]} value={f.sex} onChange={(v) => setF((x) => ({ ...x, sex: v }))} />
        <span className="small muted">{t("sexHint")}</span>
      </div>
      <div className="grid2">
        <Field label={t("age")}><input className="input" inputMode="numeric" value={f.age} onChange={(e) => setF((x) => ({ ...x, age: e.target.value }))} placeholder="34" /></Field>
        <Field label={t("height")}><input className="input" inputMode="decimal" value={f.height} onChange={(e) => setF((x) => ({ ...x, height: e.target.value }))} placeholder="178" /></Field>
      </div>
      <div className="col"><span className="label">{t("activityQ")}</span>
        <Chips options={[["sit", t("actSit")], ["feet", t("actFeet")], ["job", t("actJob")]]} value={f.activity} onChange={(v) => setF((x) => ({ ...x, activity: v }))} />
        <span className="small muted">{t("activityHint")}</span>
      </div>
      <button className="btn primary lg" onClick={save} disabled={busy}>{busy ? t("saving") : t("save")}</button>
    </>
  );
}

export { Note };
