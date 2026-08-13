import React, { useState, useEffect, useCallback } from "react";

// ─── SUPABASE CONFIG ─────────────────────────────────────────────────────────
const SUPABASE_URL = "https://mhksjkzpyurcspcnvxtr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_SnjjsrjYxe_SEWJqwht3pQ_i0yA91tr";

// ─── SUPABASE CLIENT ─────────────────────────────────────────────────────────
const sb = {
  headers: (token) => ({
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${token || SUPABASE_ANON_KEY}`,
    "Prefer": "return=representation",
  }),
  async signUp(email, password, name) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, { method: "POST", headers: this.headers(), body: JSON.stringify({ email, password, data: { name } }) });
    return r.json();
  },
  async signIn(email, password) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: this.headers(), body: JSON.stringify({ email, password }) });
    return r.json();
  },
  async signOut(token) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: "POST", headers: this.headers(token) });
  },
  async getUser(token) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: this.headers(token) });
    return r.json();
  },
  async select(table, token, filter = "") {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}&order=date.desc`, { headers: this.headers(token) });
    return r.json();
  },
  async insert(table, token, data) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers: this.headers(token), body: JSON.stringify(data) });
    return r.json();
  },
  async delete(table, token, id) {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "DELETE", headers: this.headers(token) });
  },
};

// ─── ORIGINAL GAUGE THEMES (exact from approved design) ──────────────────────
const THEMES = {
  light: {
    pageBg:    "#e6e2d8",
    bg:        "#f7f5f0",
    surface:   "#efece4",
    text:      "#191b18",
    divider:   "rgba(25,27,24,0.14)",
    accent:    "#c2551f",
    accent100: "rgba(194,85,31,0.1)",
    accent200: "rgba(194,85,31,0.18)",
    accent400: "rgba(194,85,31,0.45)",
    accent600: "#a9481a",
    n500:      "#9a978d",
    n600:      "#7b786e",
    n700:      "#5f5c54",
    n800:      "#2c2a26",
    ok:        "#2f7d4f",
    warn:      "#b57a12",
    bad:       "#b3402c",
    glow:      "rgba(194,85,31,0.22)",
    radius:    "14px",
    radiusSm:  "9px",
  },
  dark: {
    pageBg:    "#161b1f",
    bg:        "#242c32",
    surface:   "#2c353c",
    text:      "#eaf0f2",
    divider:   "rgba(234,240,242,0.16)",
    accent:    "#ff8a3d",
    accent100: "rgba(255,138,61,0.16)",
    accent200: "rgba(255,138,61,0.24)",
    accent400: "rgba(255,138,61,0.5)",
    accent600: "#ff9d5c",
    n500:      "#7d8b93",
    n600:      "#9fadb4",
    n700:      "#c2ced3",
    n800:      "#eaf0f2",
    ok:        "#4fd68a",
    warn:      "#ffc247",
    bad:       "#ff6f5c",
    glow:      "rgba(255,138,61,0.3)",
    radius:    "14px",
    radiusSm:  "9px",
  },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt = (d) => { if (!d) return "—"; const dt = new Date(d + "T00:00:00"); return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }); };
const todayISO = () => new Date().toISOString().slice(0, 10);
const pct = (done, total) => Math.min(100, Math.max(0, (done / total) * 100)).toFixed(1) + "%";

// ─── SPARKLINE ───────────────────────────────────────────────────────────────
function Sparkline({ data, field, color, h = 60 }) {
  if (!data || data.length < 2) return null;
  const vals = data.map((d) => +d[field]).filter((v) => !isNaN(v));
  if (vals.length < 2) return null;
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const PW = 326, PH = h;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * PW},${PH - ((v - min) / range) * (PH - 10) - 5}`).join(" ");
  const area = `0,${PH} ` + pts + ` ${PW},${PH}`;
  return (
    <svg viewBox={`0 0 ${PW} ${PH}`} style={{ width: "100%", height: h, display: "block", overflow: "visible" }} preserveAspectRatio="none">
      <polygon points={area} fill={color} fillOpacity={0.22} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ─── AUTH SCREEN ─────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const T = THEMES.dark;
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
      if (res.error) { setError(res.error.message || "Sign in failed."); setLoading(false); return; }
      localStorage.setItem("gauge_token", res.access_token);
      localStorage.setItem("gauge_user_name", res.user?.user_metadata?.name || form.email.split("@")[0]);
      onAuth(res.access_token, res.user?.user_metadata?.name || form.email.split("@")[0]);
    } catch { setError("Network error. Check Supabase config."); }
    setLoading(false);
  };

  const inp = { width: "100%", background: T.bg, border: `1px solid ${T.divider}`, borderRadius: T.radiusSm, color: T.text, padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit", minHeight: 44 };
  const lbl = { fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: T.n600, marginBottom: 5, display: "block" };

  return (
    <div style={{ minHeight: "100vh", background: T.pageBg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif", color: T.text }}>
      <div style={{ width: "100%", maxWidth: 360, padding: "0 20px", boxSizing: "border-box" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: T.n600, marginBottom: 6 }}>Progress tracker</div>
          <div style={{ fontSize: 34, fontWeight: 800, color: T.accent, letterSpacing: "0.1em", lineHeight: 1 }}>GAUGE</div>
          <div style={{ fontSize: 13.5, color: T.n700, marginTop: 8 }}>Sign in to keep your weigh-ins, InBody scans and sessions synced.</div>
        </div>
        <div style={{ background: T.surface, borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 6, padding: 4, borderRadius: 12, background: T.accent100 }}>
            {["signin","signup"].map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(""); }} style={{ flex: 1, minHeight: 40, border: "none", borderRadius: 9, fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", cursor: "pointer", background: mode === m ? T.accent : "transparent", color: mode === m ? "#fff" : T.n600 }}>
                {m === "signin" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>
          {mode === "signup" && <div><label style={lbl}>Full name</label><input style={inp} placeholder="Your name" value={form.name} onChange={set("name")} /></div>}
          <div><label style={lbl}>Email</label><input style={inp} type="email" placeholder="you@email.com" value={form.email} onChange={set("email")} /></div>
          <div><label style={lbl}>Password</label><input style={inp} type="password" placeholder="At least 6 characters" value={form.password} onChange={set("password")} /></div>
          {mode === "signup" && <div><label style={lbl}>Confirm password</label><input style={inp} type="password" placeholder="Repeat password" value={form.confirm} onChange={set("confirm")} /></div>}
          {error && <span style={{ fontFamily: "inherit", fontSize: 11.5, color: T.bad }}>{error}</span>}
          <button onClick={submit} disabled={loading} style={{ minHeight: 48, fontFamily: "inherit", fontSize: 15, fontWeight: 700, border: "none", borderRadius: 10, background: T.accent, color: "#fff", cursor: "pointer", boxShadow: `0 6px 16px ${T.glow}`, opacity: loading ? 0.6 : 1 }}>
            {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: T.n600, textAlign: "center" }}>Data stored securely in your Supabase project.</div>
      </div>
    </div>
  );
}

// ─── CARD KICKER ─────────────────────────────────────────────────────────────
const Kicker = ({ children, T }) => (
  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: T.n600, marginBottom: 8 }}>{children}</div>
);

// ─── HOME TAB ────────────────────────────────────────────────────────────────
function HomeTab({ weights, inbody, logs, goal, name, T }) {
  const sortedW = [...weights].sort((a, b) => new Date(a.date) - new Date(b.date));
  const latest = sortedW[sortedW.length - 1];
  const latestIb = [...inbody].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-1)[0];
  const prevIb = [...inbody].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-2, -1)[0];
  const lastLog = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  const goalPct = (() => {
    if (!goal || !latest || !sortedW[0]) return null;
    const start = sortedW[0].weight, curr = latest.weight, target = goal.target_weight;
    const done = Math.abs(curr - start), total = Math.abs(target - start);
    return total ? pct(done, total) : "0%";
  })();

  const daysLeft = goal?.target_date ? Math.max(0, Math.ceil((new Date(goal.target_date) - new Date()) / 86400000)) : null;
  const pace = (goal && latest && daysLeft) ? (Math.abs(latest.weight - goal.target_weight) / (daysLeft / 7)).toFixed(2) : null;

  const card = { background: T.surface, borderRadius: T.radius, padding: 16, display: "flex", flexDirection: "column", gap: 6 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Welcome back{name ? `, ${name.split(" ")[0]}` : ""}</h2>

      {latest ? (
        <div style={card}>
          <Kicker T={T}>Current weight</Kicker>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, margin: "4px 0 10px" }}>
            <div style={{ fontSize: 54, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 0.95 }}>{latest.weight}<span style={{ fontSize: 18, color: T.n600, marginLeft: 4 }}>kg</span></div>
            {goal && (
              <div style={{ textAlign: "right", fontSize: 11.5, color: T.n700 }}>
                <span style={{ display: "inline-block", padding: "4px 8px", borderRadius: 20, border: `1px solid ${T.accent}`, background: T.accent100, color: T.accent, fontWeight: 600, fontSize: 11, marginBottom: 4 }}>On track</span>
                <div>Target {goal.target_weight} kg</div>
                {daysLeft !== null && <div>by {fmt(goal.target_date)} · {daysLeft}d left</div>}
              </div>
            )}
          </div>
          {goal && goalPct && (
            <div style={{ margin: "2px 0 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: T.n600, marginBottom: 7 }}>
                <span>{sortedW[0]?.weight} kg start</span><span>{goal.target_weight} kg target</span>
              </div>
              <div style={{ position: "relative", height: 10, borderRadius: 6, background: T.accent100 }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 6, background: T.accent, width: goalPct, transition: "width 0.5s" }} />
              </div>
              <div style={{ fontSize: 11, color: T.n600, marginTop: 7 }}>{goalPct} of the way{pace && ` · ${pace} kg/wk needed`}</div>
            </div>
          )}
          {sortedW.length > 1 && <Sparkline data={sortedW} field="weight" color={T.accent} h={86} />}
        </div>
      ) : (
        <div style={{ ...card, textAlign: "center", color: T.n600, fontSize: 13, padding: 24 }}>
          No weight logged yet — go to <strong style={{ color: T.accent }}>Weight</strong> to start.
        </div>
      )}

      {latestIb && (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <Kicker T={T}>Latest InBody</Kicker>
            <span style={{ fontSize: 11, color: T.n700 }}>{fmt(latestIb.date)}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10 }}>
            {[
              { label: "Weight", val: latestIb.weight, unit: "kg", prev: prevIb?.weight, good: -1 },
              { label: "Body fat", val: latestIb.body_fat, unit: "%", prev: prevIb?.body_fat, good: -1 },
              { label: "Muscle", val: latestIb.muscle_mass, unit: "%", prev: prevIb?.muscle_mass, good: 1 },
            ].map((b) => {
              const d = b.prev != null ? +(b.val - b.prev).toFixed(1) : null;
              const col = d == null ? T.n600 : (d * b.good <= 0 ? T.bad : T.ok);
              return (
                <div key={b.label} style={{ border: `1px solid ${col}`, borderRadius: 10, padding: "9px 10px" }}>
                  <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.07em", color: T.n700 }}>{b.label}</div>
                  <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.1 }}>{b.val}<span style={{ fontSize: 11, color: T.n600 }}>{b.unit}</span></div>
                  {d !== null && <div style={{ fontSize: 11, fontWeight: 600, color: col }}>{d > 0 ? "+" : ""}{d}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {lastLog && (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <Kicker T={T}>Last session</Kicker>
            <span style={{ fontSize: 11, color: T.n700 }}>{fmt(lastLog.date)}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{lastLog.exercise}</div>
          <div style={{ fontSize: 12, color: T.n600 }}>{lastLog.muscle_group} · {lastLog.weight_kg} kg × {lastLog.reps} reps</div>
        </div>
      )}
    </div>
  );
}

// ─── CALORIE ENGINE ──────────────────────────────────────────────────────────
function calcCalories({ weight, height, age, gender, activity, watchAvgKcal, goalDirection, targetWeight, targetDate }) {
  if (!weight || !height || !age) return null;

  // Mifflin-St Jeor BMR
  const bmr = gender === "female"
    ? 10 * weight + 6.25 * height - 5 * age - 161
    : 10 * weight + 6.25 * height - 5 * age + 5;

  const activityMap = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, veryActive: 1.9 };
  const tdeeFormula = bmr * (activityMap[activity] || 1.55);

  // Blend with Watch data if provided (60% formula, 40% watch — watch overrides when available)
  const tdee = watchAvgKcal ? Math.round(tdeeFormula * 0.6 + watchAvgKcal * 0.4) : Math.round(tdeeFormula);

  // Deficit/surplus based on goal pace
  let adjustment = 0;
  if (goalDirection === "lose" && targetWeight && targetDate) {
    const daysLeft = Math.max(1, Math.ceil((new Date(targetDate) - new Date()) / 86400000));
    const kgToLose = Math.max(0, weight - targetWeight);
    // 1 kg fat ≈ 7700 kcal
    const dailyDeficit = Math.min(750, Math.round((kgToLose * 7700) / daysLeft));
    adjustment = -dailyDeficit;
  } else if (goalDirection === "gain") {
    adjustment = 300; // lean bulk surplus
  }

  const target = tdee + adjustment;
  const protein = Math.round(weight * 2.0);       // 2g/kg
  const fat     = Math.round(weight * 0.9);        // 0.9g/kg
  const carbKcal = target - protein * 4 - fat * 9;
  const carbs   = Math.max(0, Math.round(carbKcal / 4));

  return { tdee, target, adjustment, protein, fat, carbs, bmr: Math.round(bmr) };
}

// ─── CALORIE CARD ────────────────────────────────────────────────────────────
function CalorieCard({ weights, goal, T }) {
  const latest = [...weights].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-1)[0];
  const [stats, setStats] = useState({ age: "", height: "", gender: "male", activity: "moderate", watchAvgKcal: "", goalDirection: "lose" });
  const [result, setResult] = useState(null);
  const set = (k) => (e) => setStats((s) => ({ ...s, [k]: e.target.value }));

  const card = { background: T.surface, borderRadius: T.radius, padding: 16, display: "flex", flexDirection: "column", gap: 10 };
  const inp = { width: "100%", background: T.bg, border: `1px solid ${T.divider}`, borderRadius: T.radiusSm, color: T.text, padding: "8px 10px", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit", minHeight: 44 };
  const lbl = { fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: T.n600, marginBottom: 4, display: "block" };
  const sel = { ...inp, cursor: "pointer" };

  const calculate = () => {
    const r = calcCalories({
      weight: latest?.weight,
      height: +stats.height,
      age: +stats.age,
      gender: stats.gender,
      activity: stats.activity,
      watchAvgKcal: stats.watchAvgKcal ? +stats.watchAvgKcal : null,
      goalDirection: stats.goalDirection,
      targetWeight: goal?.target_weight,
      targetDate: goal?.target_date,
    });
    setResult(r);
  };

  const directionColor = stats.goalDirection === "lose" ? T.bad : T.ok;

  return (
    <div style={card}>
      <Kicker T={T}>Calorie analysis</Kicker>

      {!latest && (
        <div style={{ fontSize: 12, color: T.n600 }}>Log at least one weight entry first.</div>
      )}

      {latest && (
        <>
          <div style={{ fontSize: 12, color: T.n600, marginBottom: 2 }}>
            Current weight: <strong style={{ color: T.text }}>{latest.weight} kg</strong>
            {goal && <> · Target: <strong style={{ color: T.text }}>{goal.target_weight} kg</strong></>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label style={lbl}>Age</label><input style={inp} type="number" placeholder="30" value={stats.age} onChange={set("age")} /></div>
            <div><label style={lbl}>Height (cm)</label><input style={inp} type="number" placeholder="175" value={stats.height} onChange={set("height")} /></div>
            <div>
              <label style={lbl}>Gender</label>
              <select style={sel} value={stats.gender} onChange={set("gender")}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Activity level</label>
              <select style={sel} value={stats.activity} onChange={set("activity")}>
                <option value="sedentary">Sedentary (desk job)</option>
                <option value="light">Light (1–3x/wk)</option>
                <option value="moderate">Moderate (3–5x/wk)</option>
                <option value="active">Active (6–7x/wk)</option>
                <option value="veryActive">Very active (2x/day)</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Goal</label>
              <select style={sel} value={stats.goalDirection} onChange={set("goalDirection")}>
                <option value="lose">Lose fat</option>
                <option value="gain">Gain muscle</option>
                <option value="maintain">Maintain</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Apple Watch avg kcal/day</label>
              <input style={inp} type="number" placeholder="Optional" value={stats.watchAvgKcal} onChange={set("watchAvgKcal")} />
            </div>
          </div>

          <button onClick={calculate} style={{ minHeight: 48, fontFamily: "inherit", fontSize: 15, fontWeight: 700, border: "none", borderRadius: 10, background: T.accent, color: "#fff", cursor: "pointer", boxShadow: `0 6px 16px ${T.glow}` }}>
            Calculate
          </button>

          {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4, paddingTop: 14, borderTop: `1px solid ${T.divider}` }}>

              {/* Main target */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.n600 }}>Daily target</div>
                  <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1, color: T.accent }}>{result.target.toLocaleString()}<span style={{ fontSize: 16, color: T.n600, marginLeft: 4 }}>kcal</span></div>
                </div>
                <div style={{ textAlign: "right", fontSize: 12, color: T.n600 }}>
                  <div>Maintenance: {result.tdee.toLocaleString()} kcal</div>
                  <div style={{ color: directionColor, fontWeight: 600 }}>
                    {result.adjustment < 0 ? `${result.adjustment} deficit` : result.adjustment > 0 ? `+${result.adjustment} surplus` : "maintenance"}
                  </div>
                  {stats.watchAvgKcal && <div style={{ fontSize: 10, color: T.n500, marginTop: 2 }}>Blended with Watch data</div>}
                </div>
              </div>

              {/* Macro split */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { label: "Protein", val: result.protein, unit: "g", kcal: result.protein * 4, color: T.ok },
                  { label: "Carbs",   val: result.carbs,   unit: "g", kcal: result.carbs * 4,   color: T.warn },
                  { label: "Fat",     val: result.fat,     unit: "g", kcal: result.fat * 9,     color: T.accent },
                ].map((m) => (
                  <div key={m.label} style={{ border: `1px solid ${m.color}`, borderRadius: 10, padding: "9px 10px" }}>
                    <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.07em", color: T.n700 }}>{m.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1, color: T.text }}>{m.val}<span style={{ fontSize: 11, color: T.n600 }}>{m.unit}</span></div>
                    <div style={{ fontSize: 10, color: m.color, fontWeight: 600 }}>{m.kcal} kcal</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 11, color: T.n600, lineHeight: 1.5 }}>
                Based on Mifflin-St Jeor BMR ({result.bmr} kcal){stats.watchAvgKcal ? `, blended with your Apple Watch average of ${stats.watchAvgKcal} kcal/day` : ""}. Protein at 2 g/kg to preserve muscle mass.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── WEIGHT TAB ──────────────────────────────────────────────────────────────
function WeightTab({ weights, goal, token, userId, onRefresh, T }) {
  const [wForm, setWForm] = useState({ weight: "", date: todayISO() });
  const [gForm, setGForm] = useState({ target_weight: goal?.target_weight || "", target_date: goal?.target_date || "" });
  const [saving, setSaving] = useState(false);
  const sorted = [...weights].sort((a, b) => new Date(a.date) - new Date(b.date));
  const card = { background: T.surface, borderRadius: T.radius, padding: 16, display: "flex", flexDirection: "column", gap: 6 };
  const inp = { width: "100%", background: T.bg, border: `1px solid ${T.divider}`, borderRadius: T.radiusSm, color: T.text, padding: "8px 10px", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit", minHeight: 44 };
  const lbl = { fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: T.n600, marginBottom: 4, display: "block" };

  const addWeight = async () => {
    if (!wForm.weight || !wForm.date) return;
    setSaving(true);
    await sb.insert("weight_entries", token, { user_id: userId, date: wForm.date, weight: +wForm.weight });
    setWForm((f) => ({ ...f, weight: "" }));
    await onRefresh();
    setSaving(false);
  };

  const saveGoal = async () => {
    if (!gForm.target_weight || !gForm.target_date) return;
    setSaving(true);
    await sb.insert("goals", token, { user_id: userId, target_weight: +gForm.target_weight, target_date: gForm.target_date });
    await onRefresh();
    setSaving(false);
  };

  const del = async (id) => { await sb.delete("weight_entries", token, id); await onRefresh(); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ margin: 0 }}>Weight</h2>

      <div style={card}>
        <Kicker T={T}>Log today's weigh-in</Kicker>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8, marginBottom: 12 }}>
          <div><label style={lbl}>Weight (kg)</label><input style={inp} type="number" step="0.1" placeholder="84.5" value={wForm.weight} onChange={(e) => setWForm((f) => ({ ...f, weight: e.target.value }))} /></div>
          <div><label style={lbl}>Date</label><input style={inp} type="date" value={wForm.date} onChange={(e) => setWForm((f) => ({ ...f, date: e.target.value }))} /></div>
        </div>
        <button onClick={addWeight} disabled={saving} style={{ minHeight: 48, fontFamily: "inherit", fontSize: 15, fontWeight: 700, border: "none", borderRadius: 10, background: T.accent, color: "#fff", cursor: "pointer", boxShadow: `0 6px 16px ${T.glow}`, opacity: saving ? 0.6 : 1 }}>
          {saving ? "Saving…" : "Add entry"}
        </button>
      </div>

      <div style={card}>
        <Kicker T={T}>Set / edit your target</Kicker>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8, marginBottom: 12 }}>
          <div><label style={lbl}>Target weight (kg)</label><input style={inp} type="number" step="0.1" placeholder="79.0" value={gForm.target_weight} onChange={(e) => setGForm((f) => ({ ...f, target_weight: e.target.value }))} /></div>
          <div><label style={lbl}>Target date</label><input style={inp} type="date" value={gForm.target_date} onChange={(e) => setGForm((f) => ({ ...f, target_date: e.target.value }))} /></div>
        </div>
        <button onClick={saveGoal} disabled={saving} style={{ minHeight: 44, fontFamily: "inherit", fontSize: 13, fontWeight: 700, border: `1px solid ${T.accent400}`, borderRadius: 10, background: T.accent100, color: T.accent600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
          Save goal
        </button>
      </div>

      <CalorieCard weights={weights} goal={goal} T={T} />

      {sorted.length > 1 && (
        <div style={card}>
          <Kicker T={T}>Trend</Kicker>
          <Sparkline data={sorted} field="weight" color={T.accent} h={86} />
        </div>
      )}

      {weights.length > 0 && (
        <div style={card}>
          <Kicker T={T}>History</Kicker>
          {[...weights].sort((a, b) => new Date(b.date) - new Date(a.date)).map((w, i, arr) => {
            const prev = arr[i + 1];
            const d = prev ? +(w.weight - prev.weight).toFixed(1) : null;
            return (
              <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < arr.length - 1 ? `1px solid ${T.divider}` : "none" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{w.weight} kg</div>
                  <div style={{ fontSize: 11, color: T.n600 }}>{fmt(w.date)}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {d !== null && <span style={{ fontSize: 12, fontWeight: 600, color: d <= 0 ? T.ok : T.bad }}>{d <= 0 ? "" : "+"}{d} kg</span>}
                  <button onClick={() => del(w.id)} style={{ padding: "5px 10px", fontSize: 11, fontWeight: 600, border: "none", borderRadius: 8, background: T.accent100, color: T.bad, cursor: "pointer", fontFamily: "inherit" }}>Del</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── INBODY TAB ──────────────────────────────────────────────────────────────
function InbodyTab({ inbody, token, userId, onRefresh, T }) {
  const [status, setStatus] = useState("idle"); // idle | reading | confirm | saving | error
  const [pending, setPending] = useState(null);  // extracted data awaiting confirmation
  const [editPending, setEditPending] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [manualForm, setManualForm] = useState({ date: todayISO(), weight: "", body_fat: "", muscle_mass: "" });
  const [showManual, setShowManual] = useState(false);
  const fileRef = React.useRef();

  const sorted = [...inbody].sort((a, b) => new Date(a.date) - new Date(b.date));
  const latest = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const card = { background: T.surface, borderRadius: T.radius, padding: 16, display: "flex", flexDirection: "column", gap: 10 };
  const inp = { width: "100%", background: T.bg, border: `1px solid ${T.divider}`, borderRadius: T.radiusSm, color: T.text, padding: "8px 10px", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit", minHeight: 44 };
  const lbl = { fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: T.n600, marginBottom: 4, display: "block" };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("reading");
    setErrorMsg("");

    try {
      // Convert file to base64
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(",")[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });

      const mediaType = file.type === "application/pdf" ? "application/pdf" : "image/jpeg";

      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: [
              {
                type: mediaType === "application/pdf" ? "document" : "image",
                source: { type: "base64", media_type: mediaType, data: base64 },
              },
              {
                type: "text",
                text: `This is an InBody body composition scan. Extract the following values and return ONLY a JSON object with no explanation, no markdown, no backticks:
{
  "date": "YYYY-MM-DD (scan date if visible, otherwise today ${todayISO()})",
  "weight": number (body weight in kg),
  "body_fat": number (body fat percentage),
  "muscle_mass": number (skeletal muscle mass percentage or lean body mass percentage)
}
If a value is not found in the scan, use null. Return only the JSON object.`,
              },
            ],
          }],
        }),
      });

      const data = await response.json();
      const text = data.content?.map((c) => c.text || "").join("").trim();
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      setPending(parsed);
      setEditPending({ ...parsed });
      setStatus("confirm");
    } catch (err) {
      setErrorMsg("Could not read the scan. Try a clearer photo or enter manually.");
      setStatus("error");
    }
    // Reset file input
    if (fileRef.current) fileRef.current.value = "";
  };

  const confirmSave = async () => {
    setStatus("saving");
    const d = editPending;
    await sb.insert("inbody_scans", token, {
      user_id: userId,
      date: d.date || todayISO(),
      weight: d.weight ? +d.weight : null,
      body_fat: d.body_fat ? +d.body_fat : null,
      muscle_mass: d.muscle_mass ? +d.muscle_mass : null,
    });
    setPending(null);
    setEditPending(null);
    setStatus("idle");
    await onRefresh();
  };

  const saveManual = async () => {
    if (!manualForm.date) return;
    setStatus("saving");
    await sb.insert("inbody_scans", token, {
      user_id: userId,
      date: manualForm.date,
      weight: manualForm.weight ? +manualForm.weight : null,
      body_fat: manualForm.body_fat ? +manualForm.body_fat : null,
      muscle_mass: manualForm.muscle_mass ? +manualForm.muscle_mass : null,
    });
    setManualForm({ date: todayISO(), weight: "", body_fat: "", muscle_mass: "" });
    setShowManual(false);
    setStatus("idle");
    await onRefresh();
  };

  const del = async (id) => { await sb.delete("inbody_scans", token, id); await onRefresh(); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ margin: 0 }}>Body Composition</h2>

      {/* Latest scan summary */}
      {latest && (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <Kicker T={T}>Latest scan</Kicker>
            <span style={{ fontSize: 11, color: T.n700 }}>{fmt(latest.date)}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[
              { label: "Weight", val: latest.weight, unit: "kg", pv: prev?.weight, good: -1 },
              { label: "Body fat", val: latest.body_fat, unit: "%", pv: prev?.body_fat, good: -1 },
              { label: "Muscle", val: latest.muscle_mass, unit: "%", pv: prev?.muscle_mass, good: 1 },
            ].map((b) => {
              const d = b.pv != null && b.val != null ? +(b.val - b.pv).toFixed(1) : null;
              const col = d == null ? T.n600 : (d * b.good <= 0 ? T.bad : T.ok);
              return (
                <div key={b.label} style={{ border: `1px solid ${col}`, borderRadius: 10, padding: "9px 10px" }}>
                  <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.07em", color: T.n700 }}>{b.label}</div>
                  <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.1 }}>{b.val ?? "—"}<span style={{ fontSize: 11, color: T.n600 }}>{b.val != null ? b.unit : ""}</span></div>
                  {d !== null && <div style={{ fontSize: 11, fontWeight: 600, color: col }}>{d > 0 ? "+" : ""}{d}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Trends */}
      {sorted.length > 1 && (
        <div style={card}>
          <Kicker T={T}>Body fat trend</Kicker>
          <Sparkline data={sorted.filter(s => s.body_fat)} field="body_fat" color={T.warn} h={50} />
          <Kicker T={T}>Muscle trend</Kicker>
          <Sparkline data={sorted.filter(s => s.muscle_mass)} field="muscle_mass" color={T.ok} h={50} />
        </div>
      )}

      {/* Upload card */}
      <div style={card}>
        <Kicker T={T}>Upload InBody scan</Kicker>
        <div style={{ fontSize: 12, color: T.n600, lineHeight: 1.5 }}>
          Take a photo of your InBody printout or upload the PDF — Claude will read the numbers automatically.
        </div>

        {status === "idle" || status === "error" ? (
          <>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={handleFile} />
            <button onClick={() => fileRef.current?.click()} style={{ minHeight: 56, fontFamily: "inherit", fontSize: 14, fontWeight: 700, border: `2px dashed ${T.accent400}`, borderRadius: 10, background: T.accent100, color: T.accent600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M5 21h14"/></svg>
              Upload scan (photo or PDF)
            </button>
            {status === "error" && <div style={{ fontSize: 12, color: T.bad, background: "rgba(179,64,44,0.08)", borderRadius: 8, padding: "8px 12px" }}>{errorMsg}</div>}
          </>
        ) : status === "reading" ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "20px 0" }}>
            <div style={{ width: 36, height: 36, border: `3px solid ${T.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <div style={{ fontSize: 13, color: T.n600 }}>Reading your scan…</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : status === "confirm" && editPending ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12, color: T.ok, fontWeight: 600 }}>✓ Scan read — review and confirm</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={lbl}>Date</label><input style={inp} type="date" value={editPending.date || ""} onChange={(e) => setEditPending(p => ({ ...p, date: e.target.value }))} /></div>
              <div><label style={lbl}>Weight (kg)</label><input style={inp} type="number" step="0.1" value={editPending.weight ?? ""} onChange={(e) => setEditPending(p => ({ ...p, weight: e.target.value }))} /></div>
              <div><label style={lbl}>Body fat (%)</label><input style={inp} type="number" step="0.1" value={editPending.body_fat ?? ""} onChange={(e) => setEditPending(p => ({ ...p, body_fat: e.target.value }))} /></div>
              <div><label style={lbl}>Muscle (%)</label><input style={inp} type="number" step="0.1" value={editPending.muscle_mass ?? ""} onChange={(e) => setEditPending(p => ({ ...p, muscle_mass: e.target.value }))} /></div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={confirmSave} style={{ flex: 1, minHeight: 48, fontFamily: "inherit", fontSize: 14, fontWeight: 700, border: "none", borderRadius: 10, background: T.accent, color: "#fff", cursor: "pointer", boxShadow: `0 6px 16px ${T.glow}` }}>Save scan</button>
              <button onClick={() => { setPending(null); setEditPending(null); setStatus("idle"); }} style={{ minHeight: 48, padding: "0 16px", fontFamily: "inherit", fontSize: 13, fontWeight: 600, border: `1px solid ${T.divider}`, borderRadius: 10, background: "transparent", color: T.n600, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        ) : status === "saving" ? (
          <div style={{ fontSize: 13, color: T.n600, textAlign: "center", padding: "12px 0" }}>Saving…</div>
        ) : null}

        {/* Manual entry toggle */}
        <button onClick={() => setShowManual(v => !v)} style={{ background: "none", border: "none", color: T.n600, fontFamily: "inherit", fontSize: 12, cursor: "pointer", textDecoration: "underline", padding: 0, textAlign: "left" }}>
          {showManual ? "Hide manual entry" : "Enter numbers manually instead"}
        </button>

        {showManual && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 8, borderTop: `1px solid ${T.divider}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={lbl}>Date</label><input style={inp} type="date" value={manualForm.date} onChange={(e) => setManualForm(f => ({ ...f, date: e.target.value }))} /></div>
              <div><label style={lbl}>Weight (kg)</label><input style={inp} type="number" step="0.1" placeholder="84.0" value={manualForm.weight} onChange={(e) => setManualForm(f => ({ ...f, weight: e.target.value }))} /></div>
              <div><label style={lbl}>Body fat (%)</label><input style={inp} type="number" step="0.1" placeholder="22.0" value={manualForm.body_fat} onChange={(e) => setManualForm(f => ({ ...f, body_fat: e.target.value }))} /></div>
              <div><label style={lbl}>Muscle (%)</label><input style={inp} type="number" step="0.1" placeholder="42.0" value={manualForm.muscle_mass} onChange={(e) => setManualForm(f => ({ ...f, muscle_mass: e.target.value }))} /></div>
            </div>
            <button onClick={saveManual} style={{ minHeight: 44, fontFamily: "inherit", fontSize: 13, fontWeight: 700, border: "none", borderRadius: 10, background: T.accent100, color: T.accent600, cursor: "pointer" }}>
              Save manually
            </button>
          </div>
        )}
      </div>

      {/* History */}
      {inbody.length > 0 && (
        <div style={card}>
          <Kicker T={T}>History</Kicker>
          {[...inbody].sort((a, b) => new Date(b.date) - new Date(a.date)).map((s, i, arr) => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < arr.length - 1 ? `1px solid ${T.divider}` : "none" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{fmt(s.date)}</div>
                <div style={{ fontSize: 12, color: T.n600 }}>
                  {s.weight != null ? `${s.weight} kg` : "—"} · {s.body_fat != null ? `${s.body_fat}% fat` : "—"} · {s.muscle_mass != null ? `${s.muscle_mass}% muscle` : "—"}
                </div>
              </div>
              <button onClick={() => del(s.id)} style={{ padding: "5px 10px", fontSize: 11, fontWeight: 600, border: "none", borderRadius: 8, background: T.accent100, color: T.bad, cursor: "pointer", fontFamily: "inherit" }}>Del</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MEASUREMENTS TAB ────────────────────────────────────────────────────────
function MeasurementsTab({ measurements, token, userId, onRefresh, T }) {
  const [form, setForm] = useState({ date: todayISO(), waist: "", chest: "", hips: "", arms: "", thighs: "" });
  const [metric, setMetric] = useState("waist");
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const sorted = [...measurements].sort((a, b) => new Date(a.date) - new Date(b.date));
  const metrics = ["waist", "chest", "hips", "arms", "thighs"];
  const card = { background: T.surface, borderRadius: T.radius, padding: 16, display: "flex", flexDirection: "column", gap: 6 };
  const inp = { width: "100%", background: T.bg, border: `1px solid ${T.divider}`, borderRadius: T.radiusSm, color: T.text, padding: "8px 10px", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit", minHeight: 44 };
  const lbl = { fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: T.n600, marginBottom: 4, display: "block" };

  const add = async () => {
    if (!form.date) return;
    setSaving(true);
    await sb.insert("measurements", token, { user_id: userId, date: form.date, waist: +form.waist || 0, chest: +form.chest || 0, hips: +form.hips || 0, arms: +form.arms || 0, thighs: +form.thighs || 0 });
    setForm((f) => ({ date: f.date, waist: "", chest: "", hips: "", arms: "", thighs: "" }));
    await onRefresh();
    setSaving(false);
  };

  const del = async (id) => { await sb.delete("measurements", token, id); await onRefresh(); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ margin: 0 }}>Measurements</h2>

      {sorted.length > 1 && (
        <div style={card}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {metrics.map((m) => (
              <button key={m} onClick={() => setMetric(m)} style={{ padding: "7px 13px", fontSize: 11, fontWeight: 700, border: "none", borderRadius: 10, background: metric === m ? T.accent : T.bg, color: metric === m ? "#fff" : T.n600, cursor: "pointer", fontFamily: "inherit" }}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          <Sparkline data={sorted} field={metric} color={T.accent} h={120} />
          {(() => {
            const first = sorted[0][metric], last = sorted[sorted.length - 1][metric];
            const d = +(last - first).toFixed(1);
            const isGood = (metric === "waist" || metric === "hips") ? d < 0 : d > 0;
            return (
              <div style={{ marginTop: 10, display: "flex", gap: 20 }}>
                <div><div style={{ fontSize: 9, textTransform: "uppercase", color: T.n600, marginBottom: 2 }}>Start</div><div style={{ fontSize: 16, fontWeight: 700 }}>{first} cm</div></div>
                <div><div style={{ fontSize: 9, textTransform: "uppercase", color: T.n600, marginBottom: 2 }}>Latest</div><div style={{ fontSize: 16, fontWeight: 700 }}>{last} cm</div></div>
                <div><div style={{ fontSize: 9, textTransform: "uppercase", color: T.n600, marginBottom: 2 }}>Change</div><div style={{ fontSize: 16, fontWeight: 700, color: isGood ? T.ok : T.bad }}>{d > 0 ? "+" : ""}{d} cm</div></div>
              </div>
            );
          })()}
        </div>
      )}

      <div style={card}>
        <Kicker T={T}>Add measurements (cm)</Kicker>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8, marginBottom: 12 }}>
          <div><label style={lbl}>Date</label><input style={inp} type="date" value={form.date} onChange={set("date")} /></div>
          <div><label style={lbl}>Waist</label><input style={inp} type="number" step="0.1" placeholder="93" value={form.waist} onChange={set("waist")} /></div>
          <div><label style={lbl}>Chest</label><input style={inp} type="number" step="0.1" placeholder="108" value={form.chest} onChange={set("chest")} /></div>
          <div><label style={lbl}>Hips</label><input style={inp} type="number" step="0.1" placeholder="101" value={form.hips} onChange={set("hips")} /></div>
          <div><label style={lbl}>Arms</label><input style={inp} type="number" step="0.1" placeholder="37" value={form.arms} onChange={set("arms")} /></div>
          <div><label style={lbl}>Thighs</label><input style={inp} type="number" step="0.1" placeholder="58" value={form.thighs} onChange={set("thighs")} /></div>
        </div>
        <button onClick={add} disabled={saving} style={{ minHeight: 48, fontFamily: "inherit", fontSize: 15, fontWeight: 700, border: "none", borderRadius: 10, background: T.accent, color: "#fff", cursor: "pointer", boxShadow: `0 6px 16px ${T.glow}`, opacity: saving ? 0.6 : 1 }}>
          {saving ? "Saving…" : "Add entry"}
        </button>
      </div>

      {measurements.length > 0 && (
        <div style={card}>
          <Kicker T={T}>History</Kicker>
          {[...measurements].sort((a, b) => new Date(b.date) - new Date(a.date)).map((m, i, arr) => (
            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < arr.length - 1 ? `1px solid ${T.divider}` : "none" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{fmt(m.date)}</div>
                <div style={{ fontSize: 11, color: T.n600 }}>W {m.waist} · C {m.chest} · H {m.hips} · A {m.arms} · T {m.thighs}</div>
              </div>
              <button onClick={() => del(m.id)} style={{ padding: "5px 10px", fontSize: 11, fontWeight: 600, border: "none", borderRadius: 8, background: T.accent100, color: T.bad, cursor: "pointer", fontFamily: "inherit" }}>Del</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── WORKOUTS TAB ────────────────────────────────────────────────────────────
const MUSCLES = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core"];

function WorkoutsTab({ logs, token, userId, onRefresh, T }) {
  const [muscle, setMuscle] = useState("Chest");
  const [form, setForm] = useState({ exercise: "", weight_kg: "", reps: "", date: todayISO() });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const card = { background: T.surface, borderRadius: T.radius, padding: 16, display: "flex", flexDirection: "column", gap: 6 };
  const inp = { width: "100%", background: T.bg, border: `1px solid ${T.divider}`, borderRadius: T.radiusSm, color: T.text, padding: "8px 10px", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit", minHeight: 44 };
  const lbl = { fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: T.n600, marginBottom: 4, display: "block" };

  const add = async () => {
    if (!form.exercise || !form.weight_kg || !form.reps || !form.date) return;
    setSaving(true);
    await sb.insert("workout_logs", token, { user_id: userId, muscle_group: muscle, exercise: form.exercise, weight_kg: +form.weight_kg, reps: +form.reps, date: form.date });
    setForm((f) => ({ exercise: "", weight_kg: "", reps: "", date: f.date }));
    await onRefresh();
    setSaving(false);
  };

  const del = async (id) => { await sb.delete("workout_logs", token, id); await onRefresh(); };
  const muscleLogs = [...logs].filter((l) => l.muscle_group === muscle).sort((a, b) => new Date(a.date) - new Date(b.date));
  const volumeSeries = muscleLogs.map((l) => ({ date: l.date, volume: l.weight_kg * l.reps }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ margin: 0 }}>Workouts</h2>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {MUSCLES.map((m) => (
          <button key={m} onClick={() => setMuscle(m)} style={{ padding: "7px 14px", fontSize: 12, fontWeight: 700, border: `1px solid ${muscle === m ? T.accent400 : T.divider}`, borderRadius: 10, background: muscle === m ? T.accent100 : T.surface, color: muscle === m ? T.accent600 : T.n600, cursor: "pointer", fontFamily: "inherit" }}>
            {m}
          </button>
        ))}
      </div>

      {volumeSeries.length > 1 && (
        <div style={card}>
          <Kicker T={T}>{muscle} — volume trend</Kicker>
          <Sparkline data={volumeSeries} field="volume" color={T.accent} h={110} />
        </div>
      )}

      <div style={card}>
        <Kicker T={T}>Log set — {muscle}</Kicker>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8, marginBottom: 12 }}>
          <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Exercise</label><input style={inp} placeholder="e.g. Bench press" value={form.exercise} onChange={set("exercise")} /></div>
          <div><label style={lbl}>Weight (kg)</label><input style={inp} type="number" step="0.5" placeholder="70" value={form.weight_kg} onChange={set("weight_kg")} /></div>
          <div><label style={lbl}>Reps</label><input style={inp} type="number" placeholder="8" value={form.reps} onChange={set("reps")} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Date</label><input style={inp} type="date" value={form.date} onChange={set("date")} /></div>
        </div>
        <button onClick={add} disabled={saving} style={{ minHeight: 48, fontFamily: "inherit", fontSize: 15, fontWeight: 700, border: "none", borderRadius: 10, background: T.accent, color: "#fff", cursor: "pointer", boxShadow: `0 6px 16px ${T.glow}`, opacity: saving ? 0.6 : 1 }}>
          {saving ? "Saving…" : "Log set"}
        </button>
      </div>

      {muscleLogs.length > 0 && (
        <div style={card}>
          <Kicker T={T}>Logged sets</Kicker>
          {[...muscleLogs].reverse().map((l, i, arr) => (
            <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < arr.length - 1 ? `1px solid ${T.divider}` : "none" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{l.exercise}</div>
                <div style={{ fontSize: 12, color: T.n600 }}>{l.weight_kg} kg × {l.reps} · {fmt(l.date)}</div>
              </div>
              <button onClick={() => del(l.id)} style={{ padding: "5px 10px", fontSize: 11, fontWeight: 600, border: "none", borderRadius: 8, background: T.accent100, color: T.bad, cursor: "pointer", fontFamily: "inherit" }}>Del</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── NAV ICONS ───────────────────────────────────────────────────────────────
function NavIcon({ tab }) {
  const icons = {
    home:         <><path d="M3 9.5 12 2l9 7.5"/><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"/></>,
    weight:       <><circle cx={12} cy={12} r={9}/><circle cx={12} cy={12} r={5}/><circle cx={12} cy={12} r={1.3} fill="currentColor" stroke="none"/></>,
    inbody:       <><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></>,
    measurements: <><path d="M3 17 17 3l4 4L7 21z"/><path d="m14 6 2 2"/><path d="m11 9 2 2"/><path d="m8 12 2 2"/></>,
    workouts:     <><path d="M6.5 6.5 4 4"/><path d="m20 20-2.5-2.5"/><path d="M14.4 9.6 9.6 14.4"/><path d="M12.7 16.3a1.9 1.9 0 1 1-2.7-2.7l3.6-3.6a1.9 1.9 0 1 1 2.7 2.7z"/><path d="m18 6-2.5 2.5"/><path d="m6 18 2.5-2.5"/></>,
  };
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      {icons[tab]}
    </svg>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("gauge_token") || null);
  const [userName, setUserName] = useState(() => localStorage.getItem("gauge_user_name") || "");
  const [userId, setUserId] = useState(null);
  const [tab, setTab] = useState("home");
  const [theme, setTheme] = useState("dark");
  const [data, setData] = useState({ weights: [], inbody: [], measurements: [], logs: [], goal: null });
  const [loading, setLoading] = useState(false);
  const T = THEMES[theme];

  const loadData = useCallback(async (tok, uid) => {
    if (!tok || !uid) return;
    setLoading(true);
    const filter = `user_id=eq.${uid}`;
    const [weights, inbody, measurements, logs, goals] = await Promise.all([
      sb.select("weight_entries", tok, filter),
      sb.select("inbody_scans", tok, filter),
      sb.select("measurements", tok, filter),
      sb.select("workout_logs", tok, filter),
      sb.select("goals", tok, filter),
    ]);
    setData({
      weights: Array.isArray(weights) ? weights : [],
      inbody: Array.isArray(inbody) ? inbody : [],
      measurements: Array.isArray(measurements) ? measurements : [],
      logs: Array.isArray(logs) ? logs : [],
      goal: Array.isArray(goals) && goals.length ? goals[goals.length - 1] : null,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!token) return;
    sb.getUser(token).then((user) => {
      if (user?.id) {
        setUserId(user.id);
        const name = user.user_metadata?.name || user.email?.split("@")[0] || "";
        setUserName(name);
        localStorage.setItem("gauge_user_name", name);
        loadData(token, user.id);
      } else {
        setToken(null);
        localStorage.removeItem("gauge_token");
      }
    });
  }, [token, loadData]);

  const onAuth = (tok, name) => { setToken(tok); setUserName(name); };
  const signOut = async () => {
    await sb.signOut(token);
    localStorage.removeItem("gauge_token");
    localStorage.removeItem("gauge_user_name");
    setToken(null); setUserId(null);
    setData({ weights: [], inbody: [], measurements: [], logs: [], goal: null });
  };
  const refresh = () => loadData(token, userId);

  if (!token) return <AuthScreen onAuth={onAuth} />;

  const NAV = [
    { id: "home", label: "Home" },
    { id: "weight", label: "Weight" },
    { id: "inbody", label: "InBody" },
    { id: "measurements", label: "Measure" },
    { id: "workouts", label: "Workouts" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.pageBg, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 12px", boxSizing: "border-box", fontFamily: "'Inter', system-ui, sans-serif", color: T.text }}>
      <div style={{ position: "relative", width: 390, minHeight: 844, background: T.bg, borderRadius: 26, boxShadow: "0 24px 60px rgba(0,0,0,0.35)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Status bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px 6px", fontSize: 12, fontWeight: 500, flexShrink: 0 }}>
          <span>9:41</span>
          <svg width={16} height={11} viewBox="0 0 16 11" fill="none"><rect x={0} y={6} width={3} height={5} fill="currentColor"/><rect x={4.5} y={4} width={3} height={7} fill="currentColor"/><rect x={9} y={1.5} width={3} height={9.5} fill="currentColor"/><rect x={13} y={0} width={3} height={11} fill="currentColor" opacity={0.35}/></svg>
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "6px 20px 14px", flexShrink: 0, borderBottom: `1px solid ${T.divider}` }}>
          <h4 style={{ margin: 0, letterSpacing: "0.14em", color: T.accent, fontSize: 16, fontWeight: 800 }}>GAUGE</h4>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {loading && <span style={{ fontSize: 10, color: T.n600 }}>Syncing…</span>}
            <span style={{ fontSize: 11, color: T.n600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{userName}</span>
            <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} style={{ minHeight: 30, padding: "0 11px", borderRadius: 20, border: `1px solid ${T.divider}`, background: T.surface, color: T.n700, fontFamily: "inherit", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer" }}>
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            <button onClick={signOut} style={{ minHeight: 30, padding: "0 11px", borderRadius: 20, border: `1px solid ${T.divider}`, background: T.surface, color: T.n700, fontFamily: "inherit", fontSize: 10.5, fontWeight: 600, cursor: "pointer" }}>
              Sign out
            </button>
          </span>
        </div>

        {/* Scroll content */}
        <div style={{ flex: "1 1 auto", overflowY: "auto", padding: "18px 20px 24px", msOverflowStyle: "none", scrollbarWidth: "none" }}>
          {tab === "home"         && <HomeTab weights={data.weights} inbody={data.inbody} logs={data.logs} goal={data.goal} name={userName} T={T} />}
          {tab === "weight"       && <WeightTab weights={data.weights} goal={data.goal} token={token} userId={userId} onRefresh={refresh} T={T} />}
          {tab === "inbody"       && <InbodyTab inbody={data.inbody} token={token} userId={userId} onRefresh={refresh} T={T} />}
          {tab === "measurements" && <MeasurementsTab measurements={data.measurements} token={token} userId={userId} onRefresh={refresh} T={T} />}
          {tab === "workouts"     && <WorkoutsTab logs={data.logs} token={token} userId={userId} onRefresh={refresh} T={T} />}
        </div>

        {/* Bottom nav */}
        <div style={{ display: "flex", flexShrink: 0, borderTop: `1px solid ${T.divider}`, background: T.bg }}>
          {NAV.map((n) => (
            <button key={n.id} onClick={() => setTab(n.id)} style={{ flex: 1, border: "none", borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "9px 2px 10px", margin: "6px 2px 8px", cursor: "pointer", background: tab === n.id ? T.accent100 : "transparent", color: tab === n.id ? T.accent : T.n500, fontFamily: "inherit", fontSize: 10, fontWeight: 600, letterSpacing: "0.02em" }}>
              <NavIcon tab={n.id} />
              <span>{n.label}</span>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
