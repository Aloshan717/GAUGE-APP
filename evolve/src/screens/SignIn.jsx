// Sign in (invite only) and "set your password" after an invite / reset link.
import React, { useState } from "react";
import { useApp } from "../ctx.js";
import { auth, sb, store } from "../lib/api.js";
import { Icon, Logo } from "../ui.jsx";

function Toggles() {
  const { t, theme, lang, changeTheme, changeLang } = useApp();
  return (
    <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
      <button className="pill-btn" onClick={() => changeTheme(theme === "light" ? "dark" : "light")} aria-label={theme === "light" ? t("toDark") : t("toLight")}>
        <Icon name={theme === "light" ? "moon" : "sun"} size={17} />
      </button>
      <button className="pill-btn" onClick={() => changeLang(lang === "ar" ? "en" : "ar")} aria-label={t("langAria")}>{t("langBtn")}</button>
    </div>
  );
}

function PasswordInput({ value, onChange, autoComplete, id }) {
  const { t } = useApp();
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input id={id} className="input" type={show ? "text" : "password"} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)}
        style={{ paddingInlineEnd: 48 }} dir="ltr" />
      <button type="button" className="del" onClick={() => setShow((s) => !s)} aria-label={show ? t("hidePw") : t("showPw")}
        style={{ position: "absolute", insetInlineEnd: 6, top: 6 }}><Icon name="eye" size={18} /></button>
    </div>
  );
}

export default function SignIn({ onSignedIn }) {
  const { t } = useApp();
  const [email, setEmail] = useState(() => store.get("evolve_last_email") || "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true); setErr(""); setInfo("");
    const r = await sb.signIn(email.trim(), password);
    setBusy(false);
    if (r.body?.access_token) {
      auth.save(r.body);
      store.set("evolve_last_email", email.trim());
      onSignedIn();
      return;
    }
    if (r.network) setErr(t("noNet"));
    else if (r.status === 429) setErr(t("tooMany"));
    else if (/confirm/i.test(r.body?.error_description || r.body?.msg || r.body?.error_code || "")) setErr(t("notConfirmed"));
    else setErr(t("badLogin"));
  };

  const forgot = async () => {
    setErr(""); setInfo("");
    if (!email.trim()) { setErr(t("enterEmailFirst")); return; }
    const r = await sb.recover(email.trim());
    if (r.network) setErr(t("noNet"));
    else setInfo(t("forgotSent"));
  };

  return (
    <div className="full">
      <Toggles />
      <div className="col" style={{ gap: 14, marginTop: 48 }}>
        <Logo big />
        <h1 style={{ fontSize: 40, fontWeight: 800, lineHeight: 1 }}><span className="ltr">Evolve</span></h1>
        <p className="sub" style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>{t("tagline")}</p>
      </div>
      <form className="card" onSubmit={submit} style={{ padding: 18, gap: 14 }}>
        <label className="field" htmlFor="ev-email">{t("email")}
          <input id="ev-email" className="input" type="email" inputMode="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" required />
        </label>
        <label className="field" htmlFor="ev-pw">{t("password")}
          <PasswordInput id="ev-pw" value={password} onChange={setPassword} autoComplete="current-password" />
        </label>
        {err && <div className="err" role="alert">{err}</div>}
        {info && <div className="okmsg" role="status">{info}</div>}
        <button className="btn primary lg glow" type="submit" disabled={busy}>{busy ? t("signingIn") : t("signIn")}</button>
        <button className="link" type="button" onClick={forgot}>{t("forgot")}</button>
      </form>
      <div className="col">
        <div className="row top small sub"><Icon name="lock" size={16} color="var(--accent)" /><span>{t("inviteOnly")}</span></div>
        <div className="row top small sub"><Icon name="face" size={16} color="var(--accent)" /><span>{t("faceId")}</span></div>
      </div>
    </div>
  );
}

// After an invite or password-reset email: choose a password (and name).
export function SetPassword({ kind, onDone, onBack }) {
  const { t } = useApp();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (kind === "expired") {
    return (
      <div className="full">
        <Toggles />
        <div className="col" style={{ gap: 14, marginTop: 48 }}>
          <Logo big />
          <p className="body">{t("linkExpired")}</p>
          <button className="btn primary" onClick={onBack}>{t("signIn")}</button>
        </div>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) { setErr(t("pwShort")); return; }
    setBusy(true); setErr("");
    const r = await sb.updateUser({ password, ...(kind === "invite" && name.trim() ? { data: { name: name.trim() } } : {}) });
    setBusy(false);
    if (r.ok) { onDone(); return; }
    if (r.network) setErr(t("noNet"));
    else if (r.status === 401 || r.status === 403) setErr(t("linkExpired"));
    else setErr(r.body?.msg || r.body?.message || t("linkExpired"));
  };

  return (
    <div className="full">
      <Toggles />
      <div className="col" style={{ gap: 14, marginTop: 36 }}>
        <Logo big />
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>{kind === "invite" ? t("welcome") : t("resetTitle")}</h1>
        <p className="sub" style={{ margin: 0, lineHeight: 1.5 }}>{t("setSub")}</p>
      </div>
      <form className="card" onSubmit={submit} style={{ padding: 18, gap: 14 }}>
        {/* Hidden username so iPhone saves the password under the right email */}
        <input type="email" autoComplete="username" value="" readOnly hidden />
        {kind === "invite" && (
          <label className="field">{t("yourName")}
            <input className="input" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        )}
        <label className="field">{t("newPassword")}
          <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
          <span className="hint">{t("pwHint")}</span>
        </label>
        {err && <div className="err" role="alert">{err}</div>}
        <button className="btn primary lg glow" type="submit" disabled={busy}>{busy ? t("saving") : t("setPwBtn")}</button>
      </form>
    </div>
  );
}
