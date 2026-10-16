import React, { useState, useEffect, useCallback, useRef } from "react";
import { EMPTY_DATA, mergeLoadedData, parseCachedData } from "./logic";
import { store, cacheKey, auth, sb, setNotify } from "./api";
import { THEMES, cssVars } from "./theme";
import { Icon, Sheet, Banner, Segmented, Btn, Muted } from "./ui";
import AuthScreen, { Logo } from "./AuthScreen";
import TodayTab from "./screens/Today";
import BodyTab from "./screens/Body";
import TrainTab from "./screens/Train";
import PlanTab from "./screens/Plan";
import { LogMenu, WeighInForm, ScanForm, SessionForm, SetForm, MeasureForm, SHEET_TITLES } from "./forms";

const NAV = [
  { id: "today", label: "Today", icon: "today" },
  { id: "body",  label: "Body",  icon: "body" },
  { id: "log",   label: "Log",   icon: "plus" },
  { id: "train", label: "Train", icon: "train" },
  { id: "plan",  label: "Plan",  icon: "plan" },
];

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  // Signed in = we hold a session. Losing the network, or the access token
  // expiring while the phone sat idle, does NOT end it — only Supabase
  // rejecting the refresh token does.
  const [signedIn, setSignedIn] = useState(() => !!(store.get("gauge_token") || store.get("gauge_refresh")));
  const [userName, setUserName] = useState(() => store.get("gauge_user_name") || "");
  const [userId, setUserId] = useState(() => store.get("gauge_user_id") || null);
  const [tab, setTab] = useState("today");
  const [bodySeg, setBodySeg] = useState(() => store.get("gauge_body_seg") || "weight");
  const [sheet, setSheet] = useState(null);   // { name, opts, from }
  const [theme, setTheme] = useState(() => (store.get("gauge_theme") === "light" ? "light" : "dark"));
  // Start from the last synced copy so the screen is never empty on launch,
  // even before (or without) a network round-trip.
  const [data, setData] = useState(() => {
    const uid = store.get("gauge_user_id");
    return (uid && parseCachedData(store.get(cacheKey(uid)))) || EMPTY_DATA;
  });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const T = THEMES[theme];

  const dataRef = useRef(data);
  const ownerRef = useRef(store.get("gauge_user_id") || null);  // whose rows `data` holds

  const loadData = useCallback(async (uid) => {
    if (!uid) return;
    setLoading(true);
    try {
      const filter = `user_id=eq.${uid}`;
      const [weights, inbody, measurements, logs, goals, sessions] = await Promise.all([
        sb.select("weight_entries", filter),
        sb.select("inbody_scans", filter),
        sb.select("measurements", filter),
        sb.select("workout_logs", filter),
        sb.select("goals", filter, "created_at.desc"),
        sb.select("sessions", filter),
      ]);
      if (ownerRef.current !== uid) return;   // signed out / switched user mid-load

      // Surface query failures instead of silently showing empty data.
      const failures = [
        ["weight_entries", weights], ["inbody_scans", inbody],
        ["measurements", measurements], ["workout_logs", logs],
        ["goals", goals], ["sessions", sessions],
      ].filter(([, r]) => !Array.isArray(r));

      if (!failures.length) {
        setLoadError("");
      } else if (failures.every(([, r]) => r?.network)) {
        setLoadError("No connection — showing your last synced data.");
      } else {
        const msg = failures.map(([t, r]) => `${t}: ${r?.message || r?.hint || "failed"}`).join(" · ");
        console.error("Gauge data load failed —", msg);
        setLoadError(`Some data could not load (your saved data is still shown) — ${msg}`);
      }

      // A table that failed keeps what was already on screen.
      const next = mergeLoadedData(dataRef.current, { weights, inbody, measurements, logs, goals, sessions });
      dataRef.current = next;
      setData(next);
      store.set(cacheKey(uid), JSON.stringify(next));
    } catch (e) {
      console.error("Gauge sync failed —", e);
      setLoadError("Couldn't sync — showing your last synced data.");
    } finally {
      setLoading(false);
    }
  }, []);

  // End the session. A manual sign-out also wipes this device's cached copy;
  // an expired session keeps it, so signing back in shows everything at once.
  const endSession = useCallback((manual) => {
    auth.clear();
    if (manual) {
      const uid = store.get("gauge_user_id");
      if (uid) store.del(cacheKey(uid));
      store.del("gauge_user_id");
      store.del("gauge_user_name");
      setAuthNotice("");
    } else {
      setAuthNotice("Your session expired — sign in again. Your data is safe and will appear as soon as you do.");
    }
    ownerRef.current = null;
    dataRef.current = EMPTY_DATA;
    setData(EMPTY_DATA);
    setUserId(null);
    setLoadError("");
    setSignedIn(false);
  }, []);

  // Confirm who is signed in, then pull fresh data. Safe to call repeatedly.
  const bootstrap = useCallback(async () => {
    const res = await sb.getUser();
    const user = res.ok ? res.body : null;

    if (user?.id) {
      const name = user.user_metadata?.name || user.email?.split("@")[0] || "";
      setUserName(name);
      store.set("gauge_user_name", name);
      store.set("gauge_user_id", user.id);

      if (ownerRef.current !== user.id) {
        // Different account from the cached one — never mix their data
        const cached = parseCachedData(store.get(cacheKey(user.id))) || EMPTY_DATA;
        ownerRef.current = user.id;
        dataRef.current = cached;
        setData(cached);
      }
      setUserId(user.id);
      setAuthNotice("");
      await loadData(user.id);
      return;
    }

    // Couldn't confirm the user. If Supabase rejected the refresh token,
    // auth.onFatal has already ended the session. Anything else is temporary:
    // keep showing the cached data and try again on the next resume.
    if (!store.get("gauge_refresh")) return;   // session already ended
    if (res.network) setLoadError("No connection — showing your last synced data.");
    else setLoadError(`Couldn't reach the server (${res.body?.message || res.body?.msg || res.status}) — showing your last synced data.`);
  }, [loadData]);

  // Wire the module-level auth + notify hooks into this component.
  useEffect(() => {
    auth.onFatal = () => endSession(false);
    setNotify((msg) => setNotice(msg));
    return () => { auth.onFatal = null; setNotify(null); };
  }, [endSession]);

  // First load, and again after every sign-in.
  useEffect(() => {
    if (signedIn) bootstrap();
  }, [signedIn, bootstrap]);

  // Coming back to the app (resume, reconnect): renew the token if it's due
  // and pull fresh data. Throttled so quick app switches don't spam requests.
  useEffect(() => {
    if (!signedIn) return;
    let last = Date.now();
    const resync = (force = false) => {
      if (document.visibilityState !== "visible") return;
      if (!force && Date.now() - last < 30 * 1000) return;
      last = Date.now();
      bootstrap();
    };
    const onVisible = () => resync(false);
    const onOnline = () => resync(true);
    const onPageShow = (e) => { if (e.persisted) resync(true); };
    // While open, keep the token ahead of expiry (setInterval pauses when iOS
    // suspends the app; the visibility handler covers that case).
    const keepFresh = setInterval(() => {
      if (document.visibilityState === "visible") auth.validToken();
    }, 5 * 60 * 1000);

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      clearInterval(keepFresh);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [signedIn, bootstrap]);

  // Page edges and the iOS status bar follow the theme.
  useEffect(() => {
    store.set("gauge_theme", theme);
    document.body.style.background = T.pageBg;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", T.pageBg);
  }, [theme, T.pageBg]);

  const onAuth = (name) => { setUserName(name); setAuthNotice(""); setSignedIn(true); };
  const signOut = async () => {
    setSheet(null);
    await sb.signOut();
    endSession(true);
  };
  const refresh = () => loadData(userId);

  const scrollRef = useRef(null);
  const go = (id, segment) => {
    if (segment) { setBodySeg(segment); store.set("gauge_body_seg", segment); }
    setTab(id);
    scrollRef.current?.scrollTo({ top: 0 });
  };
  const pickSegment = (s) => { setBodySeg(s); store.set("gauge_body_seg", s); };
  // Sheets opened from the Log menu get a back arrow to it.
  const openSheet = (name, opts = {}) => setSheet((cur) => ({ name, opts, from: cur?.name === "log" ? "log" : null }));
  const closeSheet = () => setSheet(null);

  if (!signedIn) return <AuthScreen onAuth={onAuth} notice={authNotice} theme={theme} />;

  const formProps = { T, data, userId, onRefresh: refresh, onDone: closeSheet };
  const initial = (userName || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="gauge-page" style={{ background: T.pageBg, color: T.text }}>
      <div className="gauge-shell" style={{ ...cssVars(T), background: T.bg, position: "relative" }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px 8px", flexShrink: 0, gap: 10 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
            <Logo T={T} size={28} />
            <span style={{ fontSize: 15, fontWeight: 900, letterSpacing: "0.16em", color: T.text }}>GAUGE</span>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            {loading && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: T.n600 }}>
                <span style={{ width: 7, height: 7, borderRadius: 4, background: T.accent, animation: "g-pulse 1s ease-in-out infinite" }} /> Syncing
              </span>
            )}
            <button type="button" aria-label="Account" onClick={() => setSheet({ name: "account" })} className="g-press" style={{
              width: 36, height: 36, borderRadius: 18, border: `1.5px solid ${T.accent400}`, background: T.accent100, color: T.accent600,
              fontFamily: "inherit", fontWeight: 800, fontSize: 15, cursor: "pointer", flex: "none",
            }}>{initial}</button>
          </span>
        </div>

        {(loadError || notice) && (
          <div style={{ padding: "0 16px 8px", display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
            {loadError && (
              <Banner T={T} tone="bad" onClose={() => setLoadError("")}
                action={<button type="button" onClick={() => bootstrap()} style={{ flexShrink: 0, border: `1px solid ${T.bad}88`, background: "transparent", color: T.bad, borderRadius: 8, padding: "3px 9px", fontSize: 11.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>Retry</button>}>
                {loadError}
              </Banner>
            )}
            {notice && <Banner T={T} tone="warn" onClose={() => setNotice("")}>{notice}</Banner>}
          </div>
        )}

        {/* Scroll content */}
        <div ref={scrollRef} className="gauge-scroll" style={{ flex: "1 1 auto", overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "8px 16px 28px" }}>
          <div key={tab} className="g-fadein">
            {tab === "today" && <TodayTab T={T} data={data} name={userName} go={go} openSheet={openSheet} />}
            {tab === "body"  && <BodyTab T={T} data={data} onRefresh={refresh} openSheet={openSheet} segment={bodySeg} setSegment={pickSegment} />}
            {tab === "train" && <TrainTab T={T} data={data} onRefresh={refresh} openSheet={openSheet} />}
            {tab === "plan"  && <PlanTab T={T} data={data} userId={userId} onRefresh={refresh} />}
          </div>
        </div>

        {/* Bottom nav — always visible; the centre button logs anything */}
        <nav style={{ display: "flex", alignItems: "flex-end", flexShrink: 0, borderTop: `1px solid ${T.divider}`, background: T.bg, padding: "6px 6px calc(8px + env(safe-area-inset-bottom))" }}>
          {NAV.map((n) => n.id === "log" ? (
            <div key={n.id} style={{ flex: 1, display: "flex", justifyContent: "center" }}>
              <button type="button" aria-label="Log something" onClick={() => setSheet({ name: "log" })} className="g-press" style={{
                width: 56, height: 56, marginTop: -22, borderRadius: 20, border: `4px solid ${T.bg}`, background: T.accent, color: T.accentInk,
                display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: `0 10px 26px ${T.glow}`,
              }}>
                <Icon name="plus" size={26} stroke={2.6} />
              </button>
            </div>
          ) : (
            <button key={n.id} type="button" onClick={() => go(n.id)} aria-current={tab === n.id ? "page" : undefined} className="g-press" style={{
              flex: 1, minWidth: 0, border: "none", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              padding: "6px 2px 2px", cursor: "pointer", color: tab === n.id ? T.accent : T.n500, fontFamily: "inherit", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.02em",
            }}>
              <Icon name={n.icon} size={22} stroke={tab === n.id ? 2.1 : 1.7} />
              <span>{n.label}</span>
              <span style={{ width: 4, height: 4, borderRadius: 2, background: tab === n.id ? T.accent : "transparent" }} />
            </button>
          ))}
        </nav>

        {/* Sheets */}
        {sheet && sheet.name === "account" && (
          <Sheet T={T} title="Account" onClose={closeSheet}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 48, height: 48, borderRadius: 24, background: T.accent, color: T.accentInk, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900 }}>{initial}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 800 }}>{userName || "Signed in"}</div>
                <Muted T={T}>{loading ? "Syncing…" : "Synced with Supabase"}</Muted>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.n600 }}>Appearance</span>
              <Segmented T={T} value={theme} onChange={setTheme} options={[["dark", "Dark · black & green"], ["light", "Light"]]} />
            </div>
            <Btn T={T} kind="ghost" icon="refresh" onClick={() => { closeSheet(); bootstrap(); }}>Sync now</Btn>
            <Btn T={T} kind="danger" icon="logout" onClick={signOut}>Sign out</Btn>
          </Sheet>
        )}
        {sheet && sheet.name !== "account" && (
          <Sheet T={T} title={SHEET_TITLES[sheet.name]} onClose={closeSheet} onBack={sheet.from === "log" ? () => setSheet({ name: "log" }) : null}>
            {sheet.name === "log"     && <LogMenu T={T} open={(name) => openSheet(name)} />}
            {sheet.name === "weight"  && <WeighInForm {...formProps} />}
            {sheet.name === "scan"    && <ScanForm {...formProps} initialMode={sheet.opts?.mode} />}
            {sheet.name === "session" && <SessionForm {...formProps} />}
            {sheet.name === "set"     && <SetForm {...formProps} initialMuscle={sheet.opts?.muscle} />}
            {sheet.name === "measure" && <MeasureForm {...formProps} />}
          </Sheet>
        )}
      </div>
    </div>
  );
}
