// EVOLVE — app shell: session, data, theme, language, navigation, sheets.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppCtx } from "./ctx.js";
import { store, auth, sb, setNotify, setApiLang, readAuthHash, isMissingTable } from "./lib/api.js";
import { queued, flush, onQueue, remapDone } from "./lib/queue.js";
import { makeT } from "./lib/i18n.js";
import { goalTracks } from "./lib/core.js";
import { currentBody, maintenance, dailyTargets, dayTarget, burnByDate, feasibility, consistency, coachTips, localISO } from "./lib/body.js";
import { goalKey } from "./lib/weekly.js";
import { Icon, Logo } from "./ui.jsx";
import SignIn, { SetPassword } from "./screens/SignIn.jsx";
import Home from "./screens/Home.jsx";
import Train from "./screens/Train.jsx";
import Body from "./screens/Body.jsx";
import Goal from "./screens/Goal.jsx";
import Planner from "./screens/Planner.jsx";
import Sheets from "./sheets/Sheets.jsx";
import { NewReportDot } from "./sheets/Weekly.jsx";

export const VERSION = "1.11.0";
const REFRESH_MS = 5 * 60 * 1000;   // reload data this often while the app is open

const EMPTY = { weights: [], inbody: [], measurements: [], logs: [], sessions: [], goal: null, days: [], profile: null, plan: null, planRow: null };

function initialLang() {
  const s = store.get("evolve_lang");
  if (s === "ar" || s === "en") return s;
  return (navigator.language || "").toLowerCase().startsWith("ar") ? "ar" : "en";
}
function initialTheme() {
  const s = store.get("evolve_theme");
  if (s === "light" || s === "dark") return s;
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function Toast({ value, onDone }) {
  if (!value.action) return <div className="toast" role="status">{value}</div>;
  return (
    <div className="toast row" role="status" style={{ gap: 12 }}>
      <span>{value.msg}</span>
      <button className="toast-act" onClick={() => { value.action.run(); onDone(); }}>{value.action.label}</button>
    </div>
  );
}

export default function App() {
  const [lang, setLang] = useState(initialLang);
  const [theme, setTheme] = useState(initialTheme);
  const [hashAuth] = useState(() => readAuthHash());
  const [mode, setMode] = useState(() => {
    if (hashAuth?.error) return "expired";
    if (hashAuth?.type === "invite" || hashAuth?.type === "recovery") return hashAuth.type;
    return auth.hasSession() || hashAuth ? "app" : "signin";
  });
  const [user, setUser] = useState(() => store.json("evolve_user"));
  const [data, setData] = useState(() => {
    const u = store.json("evolve_user");
    return (u && store.json(`evolve_cache_${u.id}`)) || EMPTY;
  });
  const [tab, setTab] = useState("home");
  const [sheet, setSheet] = useState(null);          // { name, ...opts }
  const [toastMsg, setToastMsg] = useState("");
  // Today's workout and the plan being reviewed survive a reload or app switch.
  const [trainSession, setTrainSessionRaw] = useState(() => store.json(`evolve_train_${store.json("evolve_user")?.id}`));
  const setTrainSession = useCallback((v) => setTrainSessionRaw((prev) => {
    const next = typeof v === "function" ? v(prev) : v;
    store.setJson(`evolve_train_${ownerRef.current}`, next);
    return next;
  }), []);
  const [planDraft, setPlanDraftRaw] = useState(() => store.json(`evolve_plandraft_${store.json("evolve_user")?.id}`));
  const setPlanDraft = useCallback((v) => setPlanDraftRaw((prev) => {
    const next = typeof v === "function" ? v(prev) : v;
    if (next) store.setJson(`evolve_plandraft_${ownerRef.current}`, next); else store.del(`evolve_plandraft_${ownerRef.current}`);
    return next;
  }), []);
  // The calorie target in use: it only changes at the weekly check-in (or a new goal).
  const [kcalLock, setKcalLockRaw] = useState(() => store.json(`evolve_kcal_lock_${store.json("evolve_user")?.id}`));
  const setKcalLock = useCallback((v) => { setKcalLockRaw(v); if (ownerRef.current) store.setJson(`evolve_kcal_lock_${ownerRef.current}`, v); }, []);
  const [banner, setBanner] = useState("");
  const [setupMissing, setSetupMissing] = useState(false);
  const ownerRef = useRef(user?.id || null);
  const t = useMemo(() => makeT(lang), [lang]);

  // Theme + language on <html>
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    store.set("evolve_theme", theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f4f7f5" : "#060807");
  }, [theme]);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    store.set("evolve_lang", lang);
    setApiLang(lang);
  }, [lang]);

  // toast("Saved") or toast("Added", { label: "Undo", run }) — the action keeps it up longer.
  const toast = useCallback((msg, action) => { setToastMsg(action ? { msg, action } : msg); }, []);
  useEffect(() => { if (!toastMsg) return; const id = setTimeout(() => setToastMsg(""), toastMsg.action ? 6000 : 3200); return () => clearTimeout(id); }, [toastMsg]);
  useEffect(() => { setNotify((m) => setToastMsg(m)); }, []);

  // Session from an email link
  useEffect(() => {
    if (hashAuth?.access_token) {
      auth.save(hashAuth);
      history.replaceState(null, "", location.pathname);
    } else if (hashAuth?.error) {
      history.replaceState(null, "", location.pathname);
    }
  }, [hashAuth]);

  const signOutLocal = useCallback(() => {
    auth.clear();
    store.del("evolve_user");
    ownerRef.current = null;
    setUser(null);
    setData(EMPTY);
    setSheet(null);
    setTab("home");
    setMode("signin");
  }, []);
  useEffect(() => { auth.onFatal = signOutLocal; return () => { auth.onFatal = null; }; }, [signOutLocal]);

  const loadUser = useCallback(async () => {
    const r = await sb.getUser();
    if (r.ok && r.body?.id) {
      const u = { id: r.body.id, email: r.body.email, name: r.body.user_metadata?.name || "" };
      store.setJson("evolve_user", u);
      if (ownerRef.current !== u.id) {
        if (ownerRef.current) setData(EMPTY);
        setTrainSessionRaw(store.json(`evolve_train_${u.id}`));
        setPlanDraftRaw(store.json(`evolve_plandraft_${u.id}`));
        setKcalLockRaw(store.json(`evolve_kcal_lock_${u.id}`));
      }
      ownerRef.current = u.id;
      setUser(u);
      return u;
    }
    return user;
  }, [user]);

  const refresh = useCallback(async (uidArg) => {
    const uid = uidArg || ownerRef.current;
    if (!uid) return;
    const f = `user_id=eq.${uid}`;
    const [weights, inbody, measurements, logs, goals, sessions, days, profiles, plans] = await Promise.all([
      sb.select("weight_entries", f),
      sb.select("inbody_scans", f),
      sb.select("measurements", f),
      sb.select("workout_logs", f),
      sb.select("goals", f, "created_at.desc"),
      sb.select("sessions", f),
      sb.select("ev_days", `${f}&limit=200`),
      sb.select("ev_profiles", f, null),
      sb.select("ev_plans", `${f}&limit=1`, "created_at.desc"),
    ]);
    if (ownerRef.current !== uid) return;
    const rows = (r, prev) => (Array.isArray(r) ? r : prev);
    const evMissing = [days, profiles, plans].some((r) => !Array.isArray(r) && isMissingTable(r));
    setSetupMissing(evMissing);
    const failures = [weights, inbody, measurements, logs, goals, sessions].filter((r) => !Array.isArray(r));
    if (!failures.length) setBanner("");
    else if (failures.every((r) => r.network)) setBanner(t("offline"));
    else setBanner(t("loadFailed", { msg: failures.map((r) => r.message).join(" · ") }));
    setData((prev) => {
      const next = {
        weights: rows(weights, prev.weights), inbody: rows(inbody, prev.inbody), measurements: rows(measurements, prev.measurements),
        logs: rows(logs, prev.logs), sessions: rows(sessions, prev.sessions),
        goal: Array.isArray(goals) ? goals[0] || null : prev.goal,
        days: rows(days, evMissing ? [] : prev.days),
        profile: Array.isArray(profiles) ? profiles[0] || null : prev.profile,
        planRow: Array.isArray(plans) ? plans[0] || null : prev.planRow,
      };
      next.plan = next.planRow?.active === false ? null : next.planRow?.plan || null;
      store.setJson(`evolve_cache_${uid}`, next);
      return next;
    });
  }, [t]);

  // Saved offline (no signal at the gym): send it as soon as we're online again.
  const [pending, setPending] = useState(() => queued(store.json("evolve_user")?.id).length);
  useEffect(() => onQueue(() => setPending(queued(ownerRef.current).length)), []);
  const flushQueue = useCallback(async () => {
    const uid = ownerRef.current;
    if (!uid || !queued(uid).length) return;
    const r = await flush(uid);
    if (r.sent) {
      setTrainSession((s) => (s ? remapDone(s, r.ids, r.left === 0) : s));
      if (r.refused.length) setToastMsg(r.refused[0]);
      refresh();
    }
    setPending(queued(uid).length);
  }, [refresh, setTrainSession]);

  useEffect(() => {
    if (mode !== "app") return;
    (async () => { const u = await loadUser(); if (u?.id) { refresh(u.id); flushQueue(); } })();
    // Reload when the app comes back to the foreground.
    const onVis = () => { if (document.visibilityState === "visible" && ownerRef.current) { refresh(); flushQueue(); } };
    const onOnline = () => flushQueue();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);
    const retry = setInterval(() => { if (queued(ownerRef.current).length) flushQueue(); }, 20000);
    // Open for a while (say at the gym): fetch again so the watch's newest burn — and
    // the calorie target that follows it — shows up without closing the app.
    const fresh = setInterval(() => { if (document.visibilityState === "visible" && ownerRef.current && navigator.onLine !== false) refresh(); }, REFRESH_MS);
    return () => { document.removeEventListener("visibilitychange", onVis); window.removeEventListener("online", onOnline); clearInterval(retry); clearInterval(fresh); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Profile language / theme follow the account across devices.
  useEffect(() => {
    const p = data.profile;
    if (p?.lang && (p.lang === "en" || p.lang === "ar") && !store.get("evolve_lang_local")) setLang(p.lang);
    if (p?.theme && (p.theme === "light" || p.theme === "dark") && !store.get("evolve_theme_local")) setTheme(p.theme);
  }, [data.profile]);

  const saveProfile = useCallback(async (patch) => {
    if (!ownerRef.current) return { error: "no user" };
    const row = { ...(data.profile || {}), ...patch, user_id: ownerRef.current, updated_at: new Date().toISOString() };
    const r = await sb.upsert("ev_profiles", row, "user_id");
    if (r.error === "setup") setSetupMissing(true);
    if (!r.error) setData((d) => ({ ...d, profile: r.data || row }));
    return r;
  }, [data.profile]);

  const changeLang = (l) => { setLang(l); store.set("evolve_lang_local", "1"); if (mode === "app") saveProfile({ lang: l }); };
  const changeTheme = (th) => { setTheme(th); store.set("evolve_theme_local", "1"); if (mode === "app") saveProfile({ theme: th }); };

  // Everything Home and Goal show, computed once.
  const derived = useMemo(() => {
    const now = Date.now();
    const body = currentBody({ weights: data.weights, scans: data.inbody });
    const tracks = goalTracks({ goal: data.goal, weights: data.weights, scans: data.inbody, now });
    const maint = maintenance({ profile: data.profile || {}, body, days: data.days, sessions: data.sessions, weights: data.weights, scans: data.inbody, now });
    const auto = dailyTargets({ goal: data.goal, body, maint, profile: data.profile || {}, now });
    const gk = goalKey(data.goal);
    const lock = auto?.kcal && kcalLock && kcalLock.goalKey === gk ? kcalLock : null;
    const targets = lock ? { ...auto, autoKcal: auto.kcal, kcal: lock.kcal, lock } : auto;
    const feas = feasibility({ goal: data.goal, body, profile: data.profile || {}, now });
    const fit = consistency({ goal: data.goal, body });
    const tips = coachTips({ goal: data.goal, body, targets, tracks, days: data.days, weights: data.weights, scans: data.inbody, now });
    // A day's calorie target from that day's burn (see dayTarget).
    const burns = burnByDate(data.days, data.sessions);
    const targetFor = (burn) => dayTarget({ targets, burn, bmr: maint?.bmr?.kcal, sex: data.profile?.sex });
    const targetOn = (date) => targetFor(burns.get(date));
    return { body, tracks, maint, targets, feas, fit, tips, goalKey: gk, targetFor, targetOn };
  }, [data, kcalLock]);

  // First time (or a new goal): lock today's target so it doesn't drift day to day.
  useEffect(() => {
    const tg = derived.targets;
    if (mode === "app" && ownerRef.current && tg?.kcal && !tg.lock && derived.goalKey) {
      setKcalLock({ kcal: tg.kcal, goalKey: derived.goalKey, since: localISO() });
    }
  }, [derived, mode, setKcalLock]);

  const openSheet = useCallback((name, opts = {}) => setSheet({ name, ...opts }), []);
  const closeSheet = useCallback(() => setSheet(null), []);

  const ctx = {
    t, lang, theme, rtl: lang === "ar", user, data, setData, derived, refresh, saveProfile, setupMissing,
    tab, setTab, openSheet, closeSheet, sheet, toast, changeLang, changeTheme, signOutLocal, version: VERSION,
    trainSession, setTrainSession, planDraft, setPlanDraft, pending, flushQueue, kcalLock, setKcalLock,
  };

  if (mode === "signin") return <AppCtx.Provider value={ctx}><SignIn onSignedIn={() => setMode("app")} /></AppCtx.Provider>;
  if (mode === "invite" || mode === "recovery" || mode === "expired") {
    return <AppCtx.Provider value={ctx}><SetPassword kind={mode} onDone={() => setMode("app")} onBack={() => setMode("signin")} /></AppCtx.Provider>;
  }

  const name = (data.profile?.display_name || user?.name || (user?.email || "").split("@")[0] || "").trim();
  const initial = (name[0] || "E").toUpperCase();

  if (tab === "planner") {
    return (
      <AppCtx.Provider value={ctx}>
        <Planner />
        {sheet && <Sheets />}
        {toastMsg && <Toast value={toastMsg} onDone={() => setToastMsg("")} />}
      </AppCtx.Provider>
    );
  }

  const NAV = [["home", "home", t("navHome")], ["train", "train", t("navTrain")], null, ["body", "body", t("navBody")], ["goal", "goal", t("navGoal")]];

  return (
    <AppCtx.Provider value={ctx}>
      <div className="app">
        <header className="topbar">
          <div className="brand ltr"><Logo /><span>Evolve</span></div>
          <div className="top-actions">
            <button className="pill-btn" onClick={() => changeTheme(theme === "light" ? "dark" : "light")} aria-label={theme === "light" ? t("toDark") : t("toLight")}>
              <Icon name={theme === "light" ? "moon" : "sun"} size={17} />
            </button>
            <button className="pill-btn" onClick={() => changeLang(lang === "ar" ? "en" : "ar")} aria-label={t("langAria")}>{t("langBtn")}</button>
            <button className="avatar" onClick={() => openSheet("account")} aria-label={t("accountAria")}>{initial}</button>
          </div>
        </header>

        <main className="screen">
          {setupMissing && (
            <div className="banner" style={{ flexDirection: "column" }}>
              <span className="row top" style={{ gap: 8 }}><Icon name="info" size={16} color="var(--warn)" /><span>{t("setupMissing")}</span></span>
              <button className="btn primary sm" style={{ marginInlineStart: 0 }} onClick={() => openSheet("setup")}>{t("setupBtn")}</button>
            </div>
          )}
          {banner && <div className="banner"><Icon name="info" size={16} color="var(--warn)" /><span>{banner}</span></div>}
          {tab === "home" && <Home name={name} />}
          {tab === "train" && <Train />}
          {tab === "body" && <Body />}
          {tab === "goal" && <Goal />}
        </main>

        <nav className="nav">
          <div className="nav-inner">
            {NAV.map((n, i) => n ? (
              <button key={n[0]} className="nav-btn" aria-current={tab === n[0] ? "page" : undefined} onClick={() => { setTab(n[0]); window.scrollTo(0, 0); }}>
                <span className="nav-ico"><Icon name={n[1]} size={22} />{n[0] === "goal" && <NewReportDot />}</span>{n[2]}
              </button>
            ) : (
              <div className="nav-fab-wrap" key={`fab${i}`}>
                <button className="fab" aria-label={t("navLog")} onClick={() => openSheet("log")}><Icon name="plus" size={26} stroke={2.6} /></button>
              </div>
            ))}
          </div>
        </nav>
      </div>
      {sheet && <Sheets />}
      {toastMsg && <Toast value={toastMsg} onDone={() => setToastMsg("")} />}
    </AppCtx.Provider>
  );
}
