// One-time database setup, done from the phone: copy the SQL, open Supabase, Run.
import React, { useState } from "react";
import { useApp } from "../ctx.js";
import { Icon, Note } from "../ui.jsx";
import SETUP_SQL from "../../supabase/evolve_setup.sql?raw";

const PROJECT = "mhksjkzpyurcspcnvxtr";
export const SQL_EDITOR = `https://supabase.com/dashboard/project/${PROJECT}/sql/new`;

export default function Setup() {
  const { t } = useApp();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(SETUP_SQL); setCopied(true); setTimeout(() => setCopied(false), 2500); }
    catch {
      // Older browsers: select the text so it can be copied by hand.
      const ta = document.getElementById("ev-setup-sql");
      if (ta) { ta.hidden = false; ta.select(); }
    }
  };
  const steps = t("setupSteps");
  return (
    <>
      <div className="body sub">{t("setupText")}</div>
      <ol className="col" style={{ margin: 0, paddingInlineStart: 20, gap: 8 }}>
        {(Array.isArray(steps) ? steps : []).map((s, i) => <li key={i} className="body" style={{ color: "var(--text2)" }}>{s}</li>)}
      </ol>
      <button className="btn primary lg" onClick={copy}><Icon name="copy" size={18} />{copied ? t("setupCopied") : t("copySetup")}</button>
      <a className="btn lg" href={SQL_EDITOR} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>{t("openSupabase")}</a>
      <textarea id="ev-setup-sql" className="input" readOnly hidden value={SETUP_SQL} style={{ minHeight: 120, fontFamily: "ui-monospace, monospace", fontSize: 12, direction: "ltr" }} />
      <Note kind="plain" icon="lock">{t("setupSafe")}</Note>
    </>
  );
}
