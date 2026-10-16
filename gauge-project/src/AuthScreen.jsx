// Sign in / sign up.
import React, { useState } from "react";
import { sb, auth, store } from "./api";
import { THEMES, cssVars } from "./theme";
import { Btn, Field, Input, Segmented, Banner } from "./ui";

export function Logo({ T, size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ display: "block", flex: "none" }}>
      <rect width="48" height="48" rx="14" fill={T.accent} />
      <path d="M12 31a12 12 0 1 1 24 0" fill="none" stroke={T.accentInk} strokeWidth="4.2" strokeLinecap="round" />
      <path d="m24 31 6.5-8" stroke={T.accentInk} strokeWidth="4.2" strokeLinecap="round" />
      <circle cx="24" cy="31" r="3.2" fill={T.accentInk} />
    </svg>
  );
}

export default function AuthScreen({ onAuth, notice = "", theme = "dark" }) {
  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const T = THEMES[theme] || THEMES.dark;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setError("");
    if (!form.email || !form.password) { setError("Email and password required."); return; }
    if (mode === "signup" && form.password !== form.confirm) { setError("Passwords don't match."); return; }
    if (mode === "signup" && !form.name) { setError("Name required."); return; }
    setLoading(true);
    try {
      let res;
      if (mode === "signup") {
        res = await sb.signUp(form.email, form.password, form.name);
        if (res.error) { setError(res.error.message || "Sign up failed."); setLoading(false); return; }
        res = await sb.signIn(form.email, form.password);
      } else {
        res = await sb.signIn(form.email, form.password);
      }
      if (res.error || !res.access_token) {
        const m = res.error?.message || res.error_description || res.msg || (typeof res.error === "string" ? res.error : "") || "Sign in failed.";
        setError(m); setLoading(false); return;
      }
      auth.save(res);
      const name = res.user?.user_metadata?.name || form.email.split("@")[0];
      store.set("gauge_user_name", name);
      onAuth(name);
    } catch { setError("Network error. Check Supabase config."); }
    setLoading(false);
  };

  return (
    <div style={{
      ...cssVars(T), minHeight: "100dvh", width: "100%", boxSizing: "border-box", padding: "32px 0",
      display: "flex", alignItems: "center", justifyContent: "center", color: T.text,
      background: `radial-gradient(120% 60% at 50% -10%, ${T.accent200}, transparent 60%), ${T.pageBg}`,
    }}>
      <div style={{ width: "100%", maxWidth: 380, padding: "0 20px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
          <Logo T={T} size={52} />
          <div>
            <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: "0.12em", lineHeight: 1, color: T.text }}>GAUGE</div>
            <div style={{ fontSize: 15, color: T.n700, marginTop: 10, lineHeight: 1.5 }}>
              Weigh-ins, InBody scans, lifts and a coach that tells you what to change.
            </div>
          </div>
        </div>

        {notice && <div style={{ marginBottom: 12 }}><Banner T={T} tone="warn">{notice}</Banner></div>}

        <form onSubmit={(e) => { e.preventDefault(); submit(); }} style={{ background: T.surface, border: `1px solid ${T.divider}`, borderRadius: 22, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <Segmented T={T} value={mode} onChange={(m) => { setMode(m); setError(""); }} options={[["signin", "Sign in"], ["signup", "Create account"]]} />
          {mode === "signup" && <Field T={T} label="Full name"><Input T={T} placeholder="Your name" autoComplete="name" value={form.name} onChange={set("name")} /></Field>}
          <Field T={T} label="Email"><Input T={T} type="email" placeholder="you@email.com" autoComplete="email" value={form.email} onChange={set("email")} /></Field>
          <Field T={T} label="Password"><Input T={T} type="password" placeholder="At least 6 characters" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={form.password} onChange={set("password")} /></Field>
          {mode === "signup" && <Field T={T} label="Confirm password"><Input T={T} type="password" placeholder="Repeat password" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} /></Field>}
          {error && <span style={{ fontSize: 12.5, color: T.bad }}>{error}</span>}
          <Btn T={T} full type="submit" disabled={loading}>
            {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </Btn>
        </form>
        <div style={{ marginTop: 14, fontSize: 11.5, color: T.n600, textAlign: "center" }}>Data stored securely in your Supabase project.</div>
      </div>
    </div>
  );
}
