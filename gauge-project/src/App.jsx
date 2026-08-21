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
  async refresh(refreshToken) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    return r.json();
  },
  async signOut(token) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: "POST", headers: this.headers(token) });
  },
  async getUser(token) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: this.headers(token) });
    return r.json();
  },
  async select(table, token, filter = "", order = "date.desc") {
    // NOTE: `goals` has no `date` column — ordering by it returns a Postgres
    // error object instead of rows, which silently reads back as "no goal".
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}&order=${order}`, { headers: this.headers(token) });
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
// A weigh-in is a weigh-in, whether it was typed in or read off a scan.
// Merging both sources means Home can never claim "no weight" while an
// InBody scan is sitting right there showing one.
function mergeWeightSeries(weights, inbody) {
  const byDate = new Map();
  (inbody || []).forEach((s) => {
    if (s.weight != null) byDate.set(s.date, { date: s.date, weight: +s.weight, source: "scan" });
  });
  // A manual entry wins over a scan on the same date
  (weights || []).forEach((w) => {
    if (w.weight != null) byDate.set(w.date, { date: w.date, weight: +w.weight, source: "manual", id: w.id });
  });
  return [...byDate.values()].sort((a, b) => new Date(a.date) - new Date(b.date));
}

const pct = (done, total) => Math.min(100, Math.max(0, (done / total) * 100)).toFixed(1) + "%";

// ─── TREND CHART (real time axis, month labels) ──────────────────────────────
const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

function TrendChart({ data, field, color, T, h = 150, target = null, goodDirection = -1, unit = "" }) {
  const pts = (data || [])
    .map((d) => ({ t: new Date(d.date + "T00:00:00").getTime(), v: +d[field] }))
    .filter((p) => !isNaN(p.v) && !isNaN(p.t))
    .sort((a, b) => a.t - b.t);

  if (pts.length === 0) return null;

  const PW = 320, PH = h;
  const padL = 40, padR = 12, padT = 12, padB = 24;
  const iw = PW - padL - padR;
  const ih = PH - padT - padB;

  // ── time domain ──
  let tMin = pts[0].t;
  let tMax = pts[pts.length - 1].t;
  const tgtT = target?.date ? new Date(target.date + "T00:00:00").getTime() : null;
  if (tgtT && tgtT > tMax) tMax = tgtT;
  if (tMax === tMin) { tMin -= 86400000 * 3; tMax += 86400000 * 3; }

  // ── value domain ──
  const vals = pts.map((p) => p.v);
  if (target?.value != null) vals.push(+target.value);
  let vMin = Math.min(...vals), vMax = Math.max(...vals);
  if (vMax === vMin) { vMin -= 1; vMax += 1; }
  const padV = (vMax - vMin) * 0.18;
  vMin -= padV; vMax += padV;

  const X = (t) => padL + ((t - tMin) / (tMax - tMin)) * iw;
  const Y = (v) => padT + (1 - (v - vMin) / (vMax - vMin)) * ih;

  const line = pts.map((p) => `${X(p.t).toFixed(1)},${Y(p.v).toFixed(1)}`).join(" ");
  const baseY = (padT + ih).toFixed(1);
  const area = `${X(pts[0].t).toFixed(1)},${baseY} ${line} ${X(pts[pts.length-1].t).toFixed(1)},${baseY}`;

  // ── adaptive date labels ──
  // Month boundaries only make sense over a long span. Inside ~10 weeks we
  // label the actual readings instead, otherwise short ranges draw no labels.
  const spanDays = (tMax - tMin) / 86400000;
  const dayLabel  = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  let labels = [];

  if (spanDays <= 70) {
    const stamps = [...new Set(pts.map((p) => p.t))];
    if (tgtT) stamps.push(tgtT);
    const maxN = 4;
    const stride = stamps.length > maxN ? Math.ceil(stamps.length / maxN) : 1;
    labels = stamps
      .filter((_, i) => i % stride === 0 || i === stamps.length - 1)
      .map((t) => ({ t, text: dayLabel(new Date(t)) }));
  } else {
    const s = new Date(tMin);
    let cur = new Date(s.getFullYear(), s.getMonth(), 1).getTime();
    const months = [];
    while (cur <= tMax) {
      if (cur >= tMin) months.push(cur);
      const d = new Date(cur);
      cur = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    }
    // always anchor the ends so the axis is never blank
    if (!months.length || months[0] > tMin + 86400000 * 5) months.unshift(tMin);
    const stride = months.length > 6 ? Math.ceil(months.length / 5) : 1;
    labels = months
      .filter((_, i) => i % stride === 0)
      .map((t) => ({ t, text: MONTHS[new Date(t).getMonth()] }));
  }

  // keep labels inside the plot area
  const anchorFor = (x) => (x < padL + 16 ? "start" : x > PW - padR - 16 ? "end" : "middle");

  // ── target projection ──
  let tgtLine = null;
  if (target?.value != null && tgtT) {
    const last = pts[pts.length - 1];
    tgtLine = `${X(last.t).toFixed(1)},${Y(last.v).toFixed(1)} ${X(tgtT).toFixed(1)},${Y(+target.value).toFixed(1)}`;
  }

  const first = pts[0].v, last = pts[pts.length - 1].v;
  const change = +(last - first).toFixed(1);
  const good = change === 0 ? null : change * goodDirection > 0;

  return (
    <div>
      <svg viewBox={`0 0 ${PW} ${PH}`} style={{ width: "100%", height: h, display: "block" }}>
        {[0, 0.5, 1].map((f) => (
          <line key={f} x1={padL} x2={PW - padR} y1={padT + f * ih} y2={padT + f * ih}
                stroke={T.divider} strokeWidth={1} />
        ))}

        <text x={4} y={padT + 4} fill={T.n600} fontSize={9} fontFamily="inherit">{vMax.toFixed(1)}</text>
        <text x={4} y={padT + ih + 4} fill={T.n600} fontSize={9} fontFamily="inherit">{vMin.toFixed(1)}</text>

        {labels.map((L) => (
          <text key={L.t} x={X(L.t)} y={PH - 7} fill={T.n600} fontSize={8.5}
                textAnchor={anchorFor(X(L.t))} fontFamily="inherit" letterSpacing="0.05em">
            {L.text}
          </text>
        ))}

        {tgtLine && <polyline points={tgtLine} fill="none" stroke={T.n500} strokeWidth={1.5} strokeDasharray="4,4" />}

        {pts.length > 1 && <polygon points={area} fill={color} fillOpacity={0.18} />}
        {pts.length > 1 && (
          <polyline points={line} fill="none" stroke={color} strokeWidth={2.5}
                    strokeLinejoin="round" strokeLinecap="round" />
        )}

        {pts.map((p, i) => (
          <circle key={i} cx={X(p.t)} cy={Y(p.v)} r={i === pts.length - 1 ? 3.5 : 2}
                  fill={i === pts.length - 1 ? color : T.bg} stroke={color} strokeWidth={1.5} />
        ))}

        {target?.value != null && tgtT && (
          <circle cx={X(tgtT)} cy={Y(+target.value)} r={3.5} fill="none" stroke={T.n500} strokeWidth={1.5} />
        )}
      </svg>

      {pts.length > 1 && (
        <div style={{ display: "flex", gap: 14, marginTop: 4, fontSize: 11, color: T.n600, flexWrap: "wrap" }}>
          <span>Start <strong style={{ color: T.text }}>{first}{unit}</strong></span>
          <span>Now <strong style={{ color: T.text }}>{last}{unit}</strong></span>
          <span>Change <strong style={{ color: good === null ? T.n600 : good ? T.ok : T.bad }}>
            {change > 0 ? "+" : ""}{change}{unit}
          </strong></span>
        </div>
      )}
    </div>
  );
}

// ─── FRAMED CHART HEADING ────────────────────────────────────────────────────
function ChartHeading({ label, color, T, right = null }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, margin: "14px 0 6px" }}>
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "5px 11px", borderRadius: 8,
        border: `1px solid ${color}`, background: `${color}1f`,
        color, fontSize: 10.5, fontWeight: 800,
        letterSpacing: "0.12em", textTransform: "uppercase",
      }}>
        <span style={{ width: 7, height: 7, borderRadius: 2, background: color, flex: "none" }} />
        {label}
      </span>
      {right}
    </div>
  );
}

// ─── PACE BAR ────────────────────────────────────────────────────────────────
// Progress is only meaningful against time. Being 30% of the way to a target
// is good at week 2 and bad at week 10 — so we compare progress made against
// time elapsed, and colour by the ratio between them.
function computePace({ curr, start, target, startDate, targetDate, goodDirection }) {
  if (curr == null || target == null || !targetDate) return null;

  const now = Date.now();
  const tEnd = new Date(targetDate + "T00:00:00").getTime();
  const tStart = startDate ? new Date(startDate + "T00:00:00").getTime() : null;

  // Progress toward the target
  const base = start != null ? start : curr;
  const span = target - base;
  const moved = curr - base;
  let progress = span === 0 ? 100 : (moved / span) * 100;
  const reached = (target - curr) * goodDirection <= 0;
  if (reached) progress = 100;
  progress = Math.max(0, Math.min(100, progress));

  // Time elapsed toward the deadline
  let elapsed = null;
  if (tStart != null && tEnd > tStart) {
    elapsed = Math.max(0, Math.min(100, ((now - tStart) / (tEnd - tStart)) * 100));
  }

  const daysLeft = Math.ceil((tEnd - now) / 86400000);

  // Status
  let status, color, note;
  if (reached) {
    status = "Target reached";
    color = "ok";
    note = `Hit ${target} — ahead of the ${daysLeft > 0 ? `${daysLeft}-day` : ""} deadline.`.replace("  ", " ");
  } else if (daysLeft < 0) {
    status = "Date passed";
    color = "bad";
    note = `Target date has passed. ${Math.abs(+(target - curr).toFixed(1))} still to go — worth setting a new date.`;
  } else if (moved * goodDirection < 0) {
    status = "Wrong direction";
    color = "bad";
    note = `Moved away from the target since you started. ${daysLeft} days left.`;
  } else if (elapsed == null || elapsed < 8) {
    status = "Just started";
    color = "neutral";
    note = `Too early to judge pace. ${daysLeft} days to go.`;
  } else {
    const ratio = progress / elapsed;
    const remaining = Math.abs(+(target - curr).toFixed(1));
    const perWeek = daysLeft > 0 ? (remaining / (daysLeft / 7)).toFixed(2) : null;

    if (ratio >= 0.95) {
      status = "On track";
      color = "ok";
      note = `${progress.toFixed(0)}% done with ${elapsed.toFixed(0)}% of the time used.${perWeek ? ` ${perWeek}/wk keeps you on pace.` : ""}`;
    } else if (ratio >= 0.75) {
      status = "Slightly behind";
      color = "warn";
      note = `${progress.toFixed(0)}% done but ${elapsed.toFixed(0)}% of the time is gone.${perWeek ? ` Needs ${perWeek}/wk to catch up.` : ""}`;
    } else {
      status = "Behind";
      color = "bad";
      note = `Only ${progress.toFixed(0)}% done with ${elapsed.toFixed(0)}% of the time used.${perWeek ? ` Would need ${perWeek}/wk from here.` : ""}`;
    }
  }

  return { progress, elapsed, status, color, note, daysLeft, reached };
}

function PaceBar({ label, curr, start, target, startDate, targetDate, goodDirection, unit, T }) {
  const p = computePace({ curr, start, target, startDate, targetDate, goodDirection });
  if (!p) return null;

  const palette = { ok: T.ok, warn: T.warn, bad: T.bad, neutral: T.n500 };
  const c = palette[p.color];

  return (
    <div style={{ marginTop: 14 }}>
      {/* label + values */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "5px 11px", borderRadius: 8,
          border: `1px solid ${c}`, background: `${c}1f`, color: c,
          fontSize: 10.5, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase",
        }}>
          <span style={{ width: 7, height: 7, borderRadius: 2, background: c, flex: "none" }} />
          {label}
        </span>
        <span style={{ fontSize: 12, color: T.n600, whiteSpace: "nowrap" }}>
          <strong style={{ color: T.text, fontSize: 15 }}>{curr}{unit}</strong>
          <span style={{ margin: "0 5px" }}>→</span>
          {target}{unit}
        </span>
      </div>

      {/* bar with an expected-position marker */}
      <div style={{ position: "relative", height: 12, borderRadius: 7, background: T.bg, overflow: "hidden" }}>
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: `${p.progress.toFixed(1)}%`, background: c,
          borderRadius: 7, transition: "width 0.5s ease",
        }} />
        {p.elapsed != null && !p.reached && (
          <div style={{
            position: "absolute", left: `${p.elapsed.toFixed(1)}%`, top: -2, bottom: -2,
            width: 2, background: T.text, opacity: 0.55,
          }} />
        )}
      </div>

      {/* status row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 6 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: c }}>{p.status}</span>
        {p.elapsed != null && !p.reached && (
          <span style={{ fontSize: 10, color: T.n600 }}>
            marker = where you should be
          </span>
        )}
      </div>

      <div style={{ fontSize: 11.5, color: T.n700, lineHeight: 1.5, marginTop: 3 }}>{p.note}</div>
    </div>
  );
}

// ─── SESSION CARD (muscles dropdown + duration + kcal) ───────────────────────
const MUSCLE_LIST = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Cardio"];

function SessionCard({ sessions, token, userId, onRefresh, T }) {
  const sorted = [...(sessions || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  const last = sorted[0];

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ date: todayISO(), duration_min: "", kcal: "", muscles: [] });
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const card = { background: T.surface, borderRadius: T.radius, padding: 16, display: "flex", flexDirection: "column", gap: 10 };
  const inp = { width: "100%", background: T.bg, border: `1px solid ${T.divider}`, borderRadius: T.radiusSm, color: T.text, padding: "8px 10px", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit", minHeight: 44 };
  const lbl = { fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: T.n600, marginBottom: 4, display: "block" };

  const toggleMuscle = (m) => setForm((f) => ({
    ...f,
    muscles: f.muscles.includes(m) ? f.muscles.filter((x) => x !== m) : [...f.muscles, m],
  }));

  const save = async () => {
    if (!form.date) return;
    setSaving(true);
    await sb.insert("sessions", token, {
      user_id: userId,
      date: form.date,
      duration_min: form.duration_min ? +form.duration_min : null,
      kcal: form.kcal ? +form.kcal : null,
      muscles: form.muscles.join(", "),
    });
    setForm({ date: todayISO(), duration_min: "", kcal: "", muscles: [] });
    setEditing(false);
    setOpen(false);
    setSaving(false);
    await onRefresh();
  };

  const summary = form.muscles.length ? form.muscles.join(", ") : "Select muscles";

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Kicker T={T}>Last session</Kicker>
        {last && <span style={{ fontSize: 11, color: T.n700 }}>{fmt(last.date)}</span>}
      </div>

      {last && !editing && (
        <>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>
            {last.muscles || "No muscles recorded"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 8, marginTop: 4 }}>
            <div style={{ background: T.accent100, borderRadius: 10, padding: "9px 10px" }}>
              <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.07em", color: T.n700 }}>Duration</div>
              <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.15 }}>{last.duration_min ?? "—"}<span style={{ fontSize: 11, color: T.n600 }}> min</span></div>
            </div>
            <div style={{ background: T.accent100, borderRadius: 10, padding: "9px 10px" }}>
              <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.07em", color: T.n700 }}>Calories</div>
              <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.15 }}>{last.kcal ?? "—"}<span style={{ fontSize: 11, color: T.n600 }}> kcal</span></div>
            </div>
          </div>
        </>
      )}

      {!last && !editing && (
        <div style={{ fontSize: 13, color: T.n600 }}>No sessions logged yet.</div>
      )}

      {editing && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={lbl}>Muscles targeted</label>
            <div style={{ position: "relative" }}>
              <button type="button" onClick={() => setOpen((v) => !v)}
                style={{ width: "100%", minHeight: 46, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "0 12px", borderRadius: 10, border: `1px solid ${T.divider}`, background: T.bg, color: form.muscles.length ? T.text : T.n600, fontFamily: "inherit", fontSize: 14, cursor: "pointer", textAlign: "left" }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{summary}</span>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={T.n600} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>

              {open && (
                <div style={{ position: "absolute", left: 0, right: 0, top: 50, zIndex: 20, background: T.bg, border: `1px solid ${T.divider}`, borderRadius: 12, boxShadow: "0 12px 30px rgba(0,0,0,0.35)", overflow: "hidden" }}>
                  {MUSCLE_LIST.map((m) => {
                    const on = form.muscles.includes(m);
                    return (
                      <button key={m} type="button" onClick={() => toggleMuscle(m)}
                        style={{ width: "100%", minHeight: 46, display: "flex", alignItems: "center", gap: 10, padding: "0 12px", border: "none", borderBottom: `1px solid ${T.divider}`, background: on ? T.accent100 : "transparent", color: T.text, fontFamily: "inherit", fontSize: 13.5, cursor: "pointer", textAlign: "left" }}>
                        <span style={{ width: 18, height: 18, flex: "none", borderRadius: 5, border: `1.5px solid ${on ? T.accent : T.n500}`, background: on ? T.accent : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700 }}>
                          {on ? "✓" : ""}
                        </span>
                        {m}
                      </button>
                    );
                  })}
                  <button type="button" onClick={() => setOpen(false)}
                    style={{ width: "100%", minHeight: 44, border: "none", background: T.accent100, color: T.accent, fontFamily: "inherit", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}>
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 10 }}>
            <div><label style={lbl}>Duration (min)</label><input style={inp} type="number" placeholder="e.g. 58" value={form.duration_min} onChange={(e) => setForm((f) => ({ ...f, duration_min: e.target.value }))} /></div>
            <div><label style={lbl}>Calories (kcal)</label><input style={inp} type="number" placeholder="e.g. 472" value={form.kcal} onChange={(e) => setForm((f) => ({ ...f, kcal: e.target.value }))} /></div>
          </div>
          <div><label style={lbl}>Date</label><input style={inp} type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={save} disabled={saving} style={{ flex: 1, minHeight: 46, fontFamily: "inherit", fontSize: 14, fontWeight: 700, border: "none", borderRadius: 10, background: T.accent, color: "#fff", cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Saving…" : "Save session"}
            </button>
            <button onClick={() => { setEditing(false); setOpen(false); }} style={{ minHeight: 46, padding: "0 16px", fontFamily: "inherit", fontSize: 13, fontWeight: 600, border: `1px solid ${T.divider}`, borderRadius: 10, background: "transparent", color: T.n600, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {!editing && (
        <button onClick={() => setEditing(true)}
          style={{ minHeight: 44, fontFamily: "inherit", fontSize: 13, fontWeight: 700, border: `1px solid ${T.accent400}`, borderRadius: 10, background: T.accent100, color: T.accent600, cursor: "pointer", marginTop: 4 }}>
          Log a session
        </button>
      )}

      <div style={{ fontSize: 10.5, color: T.n600, lineHeight: 1.5 }}>
        Read these off your Apple Watch workout summary. A web app can't reach Apple Health directly.
      </div>
    </div>
  );
}

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
      if (res.refresh_token) localStorage.setItem("gauge_refresh", res.refresh_token);
      localStorage.setItem("gauge_user_name", res.user?.user_metadata?.name || form.email.split("@")[0]);
      onAuth(res.access_token, res.user?.user_metadata?.name || form.email.split("@")[0]);
    } catch { setError("Network error. Check Supabase config."); }
    setLoading(false);
  };

  const inp = { width: "100%", background: T.bg, border: `1px solid ${T.divider}`, borderRadius: T.radiusSm, color: T.text, padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit", minHeight: 44 };
  const lbl = { fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: T.n600, marginBottom: 5, display: "block" };

  return (
    <div style={{ minHeight: "100dvh", width: "100%", background: T.pageBg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif", color: T.text, padding: "24px 0", boxSizing: "border-box" }}>
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
function HomeTab({ weights, inbody, sessions, goal, name, sessionsProps, T }) {
  const sortedW = mergeWeightSeries(weights, inbody);
  const latest = sortedW[sortedW.length - 1];
  const sortedIb = [...inbody].sort((a, b) => new Date(a.date) - new Date(b.date));
  const latestIb = sortedIb[sortedIb.length - 1];
  const prevIb = sortedIb[sortedIb.length - 2];

  // Baselines for pace: the first scan that actually recorded each metric
  const firstBf  = sortedIb.find((s) => s.body_fat != null);
  const firstMus = sortedIb.find((s) => s.muscle_mass != null);
  const firstIb = {
    body_fat: firstBf?.body_fat,
    bfDate:   firstBf?.date,
    muscle:   firstMus?.muscle_mass,
    musDate:  firstMus?.date,
  };

  const card = { background: T.surface, borderRadius: T.radius, padding: 16, display: "flex", flexDirection: "column", gap: 10 };

  const daysLeft = goal?.target_date ? Math.max(0, Math.ceil((new Date(goal.target_date) - new Date()) / 86400000)) : null;

  // 7-day training load
  const weekAgo = Date.now() - 7 * 86400000;
  const weekSessions = (sessions || []).filter((s) => new Date(s.date).getTime() >= weekAgo);
  const weekKcal = weekSessions.reduce((a, s) => a + (+s.kcal || 0), 0);
  const weekMin = weekSessions.reduce((a, s) => a + (+s.duration_min || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Welcome back{name ? `, ${name.split(" ")[0]}` : ""}</h2>
        <div style={{ fontSize: 12, color: T.n600, marginTop: 2 }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}
        </div>
      </div>

      {/* ── Weight + goal chart ── */}
      {latest ? (
        <div style={card}>
          <Kicker T={T}>Current weight</Kicker>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
            <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 0.95 }}>
              {latest.weight}<span style={{ fontSize: 17, color: T.n600, marginLeft: 4 }}>kg</span>
            </div>
            {goal && (
              <div style={{ textAlign: "right", fontSize: 11.5, color: T.n700 }}>
                <div style={{ display: "inline-block", padding: "3px 8px", borderRadius: 20, border: `1px solid ${T.accent}`, background: T.accent100, color: T.accent, fontWeight: 600, fontSize: 10.5, marginBottom: 4 }}>
                  {daysLeft} days left
                </div>
                <div>Goal date {fmt(goal.target_date)}</div>
              </div>
            )}
          </div>

        </div>
      ) : (
        <div style={{ ...card, textAlign: "center", color: T.n600, fontSize: 13, padding: 24 }}>
          No weight logged yet — open <strong style={{ color: T.accent }}>Weight</strong> to start.
        </div>
      )}

      {/* ── Body composition ── */}
      {latestIb && (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <Kicker T={T}>Body composition</Kicker>
            <span style={{ fontSize: 11, color: T.n700 }}>{fmt(latestIb.date)}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[
              { label: "Weight", val: latestIb.weight, unit: "kg", pv: prevIb?.weight, good: -1 },
              { label: "Body fat", val: latestIb.body_fat, unit: "%", pv: prevIb?.body_fat, good: -1 },
              { label: "Muscle", val: latestIb.muscle_mass, unit: "%", pv: prevIb?.muscle_mass, good: 1 },
            ].map((b) => {
              const d = (b.pv != null && b.val != null) ? +(b.val - b.pv).toFixed(1) : null;
              const col = d == null ? T.n600 : (d * b.good <= 0 ? T.bad : T.ok);
              return (
                <div key={b.label} style={{ border: `1px solid ${col}`, borderRadius: 10, padding: "9px 8px" }}>
                  <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em", color: T.n700 }}>{b.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>{b.val ?? "—"}<span style={{ fontSize: 10, color: T.n600 }}>{b.val != null ? b.unit : ""}</span></div>
                  {d !== null && <div style={{ fontSize: 10.5, fontWeight: 600, color: col }}>{d > 0 ? "+" : ""}{d}</div>}
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: 10.5, color: T.n600, marginTop: 2 }}>
            Deltas compare against your previous scan. Full charts live on the InBody tab.
          </div>
        </div>
      )}

      {/* ── Goal pace ── */}
      {goal && goal.target_date && (goal.target_weight != null || goal.target_body_fat != null || goal.target_muscle != null) && (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <Kicker T={T}>Goal pace</Kicker>
            <span style={{ fontSize: 11, color: T.n700 }}>{daysLeft} days left</span>
          </div>

          {goal.target_weight != null && (
            <PaceBar
              label="Weight" unit=" kg" T={T} goodDirection={-1}
              curr={latest?.weight}
              start={sortedW[0]?.weight}
              startDate={sortedW[0]?.date}
              target={goal.target_weight}
              targetDate={goal.target_date}
            />
          )}

          {goal.target_body_fat != null && (
            <PaceBar
              label="Body fat" unit="%" T={T} goodDirection={-1}
              curr={latestIb?.body_fat}
              start={firstIb.body_fat}
              startDate={firstIb.bfDate}
              target={goal.target_body_fat}
              targetDate={goal.target_date}
            />
          )}

          {goal.target_muscle != null && (
            <PaceBar
              label="Muscle" unit="%" T={T} goodDirection={1}
              curr={latestIb?.muscle_mass}
              start={firstIb.muscle}
              startDate={firstIb.musDate}
              target={goal.target_muscle}
              targetDate={goal.target_date}
            />
          )}
        </div>
      )}

      {/* ── This week ── */}
      {weekSessions.length > 0 && (
        <div style={card}>
          <Kicker T={T}>Last 7 days</Kicker>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[
              { label: "Sessions", val: weekSessions.length, unit: "" },
              { label: "Time", val: Math.round(weekMin), unit: "min" },
              { label: "Burned", val: Math.round(weekKcal), unit: "kcal" },
            ].map((s) => (
              <div key={s.label} style={{ background: T.accent100, borderRadius: 10, padding: "9px 8px" }}>
                <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em", color: T.n700 }}>{s.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.15 }}>{s.val}<span style={{ fontSize: 10, color: T.n600 }}> {s.unit}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Last session ── */}
      <SessionCard sessions={sessions} T={T} {...sessionsProps} />
    </div>
  );
}

// ─── CALORIE ENGINE ──────────────────────────────────────────────────────────
function calcCalories({ weight, height, age, gender, activity, burnKcal, goalDirection, targetWeight, targetDate }) {
  if (!weight || !height || !age) return null;

  const bmr = gender === "female"
    ? 10 * weight + 6.25 * height - 5 * age - 161
    : 10 * weight + 6.25 * height - 5 * age + 5;

  const activityMap = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, veryActive: 1.9 };
  const tdeeFormula = bmr * (activityMap[activity] || 1.55);

  // If we know the real average daily burn from logged sessions, blend it in
  const tdee = burnKcal
    ? Math.round(tdeeFormula * 0.6 + (bmr * 1.2 + burnKcal) * 0.4)
    : Math.round(tdeeFormula);

  let adjustment = 0;
  if (goalDirection === "lose") {
    if (targetWeight && targetDate) {
      const daysLeft = Math.max(1, Math.ceil((new Date(targetDate) - new Date()) / 86400000));
      const kgToLose = Math.max(0, weight - targetWeight);
      adjustment = -Math.min(750, Math.round((kgToLose * 7700) / daysLeft));
    } else {
      adjustment = -500;
    }
  } else if (goalDirection === "gain") {
    adjustment = 300;
  } else if (goalDirection === "recomp") {
    // Fat down + muscle up: a small deficit with high protein is the
    // established approach. Aggressive cuts cost lean mass.
    adjustment = -250;
  }

  const target = tdee + adjustment;
  const protein = Math.round(weight * (goalDirection === "recomp" ? 2.2 : 2.0));
  const fat     = Math.round(weight * 0.9);
  const carbs   = Math.max(0, Math.round((target - protein * 4 - fat * 9) / 4));

  return { tdee, target, adjustment, protein, fat, carbs, bmr: Math.round(bmr) };
}

// ─── CALORIE CARD ────────────────────────────────────────────────────────────
function CalorieCard({ weights, inbody, goal, sessions, T }) {
  const latest = mergeWeightSeries(weights, inbody).slice(-1)[0];

  // Average daily burn over the last 14 days, from logged sessions
  const avgBurn = (() => {
    const since = Date.now() - 14 * 86400000;
    const recent = (sessions || []).filter((s) => new Date(s.date).getTime() >= since && s.kcal);
    if (!recent.length) return null;
    const total = recent.reduce((a, s) => a + (+s.kcal || 0), 0);
    return Math.round(total / 14);
  })();

  const [stats, setStats] = useState({ age: "", height: "", gender: "male", activity: "moderate", goalDirection: "lose" });
  const [result, setResult] = useState(null);
  const set = (k) => (e) => setStats((s) => ({ ...s, [k]: e.target.value }));

  const card = { background: T.surface, borderRadius: T.radius, padding: 16, display: "flex", flexDirection: "column", gap: 10 };
  const inp = { width: "100%", background: T.bg, border: `1px solid ${T.divider}`, borderRadius: T.radiusSm, color: T.text, padding: "8px 10px", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit", minHeight: 44 };
  const lbl = { fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: T.n600, marginBottom: 4, display: "block" };

  const calculate = () => {
    setResult(calcCalories({
      weight: latest?.weight,
      height: +stats.height,
      age: +stats.age,
      gender: stats.gender,
      activity: stats.activity,
      burnKcal: avgBurn,
      goalDirection: stats.goalDirection,
      targetWeight: goal?.target_weight,
      targetDate: goal?.target_date,
    }));
  };

  const dirColor = stats.goalDirection === "lose" ? T.bad : T.ok;

  return (
    <div style={card}>
      <Kicker T={T}>Calorie analysis</Kicker>

      {!latest && <div style={{ fontSize: 12, color: T.n600 }}>Log at least one weight entry first.</div>}

      {latest && (
        <>
          <div style={{ fontSize: 12, color: T.n600 }}>
            Current weight: <strong style={{ color: T.text }}>{latest.weight} kg</strong>
            {goal && <> · Target: <strong style={{ color: T.text }}>{goal.target_weight} kg</strong></>}
          </div>

          {avgBurn ? (
            <div style={{ fontSize: 11.5, color: T.ok, background: T.accent100, borderRadius: 8, padding: "8px 10px" }}>
              Using your logged sessions: <strong>{avgBurn} kcal/day</strong> average burn over the last 14 days.
            </div>
          ) : (
            <div style={{ fontSize: 11.5, color: T.n600, background: T.bg, borderRadius: 8, padding: "8px 10px" }}>
              Log sessions on the Home tab and this will use your real burn instead of an estimate.
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 10 }}>
            <div><label style={lbl}>Age</label><input style={inp} type="number" placeholder="e.g. 30" value={stats.age} onChange={set("age")} /></div>
            <div><label style={lbl}>Height (cm)</label><input style={inp} type="number" placeholder="e.g. 175" value={stats.height} onChange={set("height")} /></div>
            <div>
              <label style={lbl}>Gender</label>
              <select style={inp} value={stats.gender} onChange={set("gender")}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Activity level</label>
              <select style={inp} value={stats.activity} onChange={set("activity")}>
                <option value="sedentary">Sedentary</option>
                <option value="light">Light (1–3x/wk)</option>
                <option value="moderate">Moderate (3–5x/wk)</option>
                <option value="active">Active (6–7x/wk)</option>
                <option value="veryActive">Very active</option>
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={lbl}>Goal</label>
              <select style={inp} value={stats.goalDirection} onChange={set("goalDirection")}>
                <option value="recomp">Build muscle &amp; lose fat</option>
                <option value="lose">Lose fat</option>
                <option value="gain">Gain muscle</option>
                <option value="maintain">Maintain</option>
              </select>
            </div>
          </div>

          <button onClick={calculate} style={{ minHeight: 48, fontFamily: "inherit", fontSize: 15, fontWeight: 700, border: "none", borderRadius: 10, background: T.accent, color: "#fff", cursor: "pointer", boxShadow: `0 6px 16px ${T.glow}` }}>
            Calculate
          </button>

          {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 12, borderTop: `1px solid ${T.divider}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.n600 }}>Daily target</div>
                  <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1, color: T.accent }}>
                    {result.target.toLocaleString()}<span style={{ fontSize: 15, color: T.n600, marginLeft: 4 }}>kcal</span>
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: 11.5, color: T.n600 }}>
                  <div>Maintenance {result.tdee.toLocaleString()}</div>
                  <div style={{ color: dirColor, fontWeight: 600 }}>
                    {result.adjustment < 0 ? `${result.adjustment} deficit` : result.adjustment > 0 ? `+${result.adjustment} surplus` : "maintenance"}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { label: "Protein", val: result.protein, kcal: result.protein * 4, color: T.ok },
                  { label: "Carbs",   val: result.carbs,   kcal: result.carbs * 4,   color: T.warn },
                  { label: "Fat",     val: result.fat,     kcal: result.fat * 9,     color: T.accent },
                ].map((m) => (
                  <div key={m.label} style={{ border: `1px solid ${m.color}`, borderRadius: 10, padding: "9px 8px" }}>
                    <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em", color: T.n700 }}>{m.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>{m.val}<span style={{ fontSize: 10, color: T.n600 }}>g</span></div>
                    <div style={{ fontSize: 10, color: m.color, fontWeight: 600 }}>{m.kcal} kcal</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 10.5, color: T.n600, lineHeight: 1.5 }}>
                Mifflin-St Jeor BMR {result.bmr} kcal{avgBurn ? `, blended with your logged ${avgBurn} kcal/day burn` : ""}. {stats.goalDirection === "recomp" ? "Recomposition uses a small 250 kcal deficit with protein at 2.2 g/kg — a steep cut costs lean mass." : "Protein at 2 g/kg to protect muscle."}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── WEIGHT TAB ──────────────────────────────────────────────────────────────
function WeightTab({ weights, inbody, goal, sessions, token, userId, onRefresh, T }) {
  const [wForm, setWForm] = useState({ weight: "", date: todayISO() });
  const [gForm, setGForm] = useState({ target_weight: goal?.target_weight || "", target_date: goal?.target_date || "", target_body_fat: goal?.target_body_fat || "", target_muscle: goal?.target_muscle || "" });
  const [saving, setSaving] = useState(false);
  const sorted = mergeWeightSeries(weights, inbody);
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
    // A date plus at least one target is enough
    const hasTarget = gForm.target_weight || gForm.target_body_fat || gForm.target_muscle;
    if (!gForm.target_date || !hasTarget) return;
    setSaving(true);
    await sb.insert("goals", token, {
      user_id: userId,
      target_date: gForm.target_date,
      target_weight:   gForm.target_weight   ? +gForm.target_weight   : null,
      target_body_fat: gForm.target_body_fat ? +gForm.target_body_fat : null,
      target_muscle:   gForm.target_muscle   ? +gForm.target_muscle   : null,
    });
    await onRefresh();
    setSaving(false);
  };

  const del = async (id) => { await sb.delete("weight_entries", token, id); await onRefresh(); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ margin: 0 }}>Weight</h2>

      <div style={card}>
        <Kicker T={T}>Log today's weigh-in</Kicker>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 10, marginTop: 8, marginBottom: 12 }}>
          <div><label style={lbl}>Weight (kg)</label><input style={inp} type="number" step="0.1" placeholder="e.g. 84.5" value={wForm.weight} onChange={(e) => setWForm((f) => ({ ...f, weight: e.target.value }))} /></div>
          <div><label style={lbl}>Date</label><input style={inp} type="date" value={wForm.date} onChange={(e) => setWForm((f) => ({ ...f, date: e.target.value }))} /></div>
        </div>
        <button onClick={addWeight} disabled={saving} style={{ minHeight: 48, fontFamily: "inherit", fontSize: 15, fontWeight: 700, border: "none", borderRadius: 10, background: T.accent, color: "#fff", cursor: "pointer", boxShadow: `0 6px 16px ${T.glow}`, opacity: saving ? 0.6 : 1 }}>
          {saving ? "Saving…" : "Add entry"}
        </button>
      </div>

      <div style={card}>
        <Kicker T={T}>Set / edit your targets</Kicker>
        <div style={{ fontSize: 11.5, color: T.n600, lineHeight: 1.5, marginBottom: 4 }}>
          Fill in only what you care about. Leave a field blank to skip that target — you don't need a weight goal to track body recomposition.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 10, marginTop: 4, marginBottom: 12 }}>
          <div><label style={lbl}>Target weight (kg)</label><input style={inp} type="number" step="0.1" placeholder="optional" value={gForm.target_weight} onChange={(e) => setGForm((f) => ({ ...f, target_weight: e.target.value }))} /></div>
          <div><label style={lbl}>Target date</label><input style={inp} type="date" value={gForm.target_date} onChange={(e) => setGForm((f) => ({ ...f, target_date: e.target.value }))} /></div>
          <div><label style={lbl}>Target body fat (%)</label><input style={inp} type="number" step="0.1" placeholder="optional" value={gForm.target_body_fat} onChange={(e) => setGForm((f) => ({ ...f, target_body_fat: e.target.value }))} /></div>
          <div><label style={lbl}>Target muscle (%)</label><input style={inp} type="number" step="0.1" placeholder="optional" value={gForm.target_muscle} onChange={(e) => setGForm((f) => ({ ...f, target_muscle: e.target.value }))} /></div>
        </div>
        <button onClick={saveGoal} disabled={saving} style={{ minHeight: 44, fontFamily: "inherit", fontSize: 13, fontWeight: 700, border: `1px solid ${T.accent400}`, borderRadius: 10, background: T.accent100, color: T.accent600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
          Save goal
        </button>
      </div>

      <CalorieCard weights={weights} inbody={inbody} goal={goal} sessions={sessions} T={T} />

      {sorted.length > 1 && (
        <div style={card}>
          <Kicker T={T}>Trend</Kicker>
          <Sparkline data={sorted} field="weight" color={T.accent} h={86} />
        </div>
      )}

      {sorted.length > 0 && (
        <div style={card}>
          <Kicker T={T}>History</Kicker>
          {[...sorted].reverse().map((w, i, arr) => {
            const prev = arr[i + 1];
            const d = prev ? +(w.weight - prev.weight).toFixed(1) : null;
            const fromScan = w.source === "scan";
            return (
              <div key={`${w.date}-${w.source}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < arr.length - 1 ? `1px solid ${T.divider}` : "none" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{w.weight} kg</div>
                  <div style={{ fontSize: 11, color: T.n600, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {fmt(w.date)}
                    {fromScan && (
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: T.n500, border: `1px solid ${T.divider}`, borderRadius: 5, padding: "1px 5px" }}>
                        from scan
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                  {d !== null && <span style={{ fontSize: 12, fontWeight: 600, color: d <= 0 ? T.ok : T.bad }}>{d <= 0 ? "" : "+"}{d} kg</span>}
                  {fromScan ? (
                    <span style={{ fontSize: 10, color: T.n500 }}>InBody</span>
                  ) : (
                    <button onClick={() => del(w.id)} style={{ padding: "5px 10px", fontSize: 11, fontWeight: 600, border: "none", borderRadius: 8, background: T.accent100, color: T.bad, cursor: "pointer", fontFamily: "inherit" }}>Del</button>
                  )}
                </div>
              </div>
            );
          })}
          <div style={{ fontSize: 10.5, color: T.n600, marginTop: 6, lineHeight: 1.5 }}>
            Entries marked "from scan" come from your InBody uploads. Delete those on the InBody tab.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── METRIC ANALYSIS ─────────────────────────────────────────────────────────
// Turns two scans plus a target into plain-language commentary.
function analyseMetric({ label, curr, prev, first, target, targetDate, goodDirection, unit }) {
  if (curr == null) return null;

  const lines = [];
  const delta = prev != null ? +(curr - prev).toFixed(1) : null;
  const total = first != null ? +(curr - first).toFixed(1) : null;

  // Movement since the previous scan
  if (delta === null) {
    lines.push(`First recorded ${label.toLowerCase()} reading. The next scan will show movement.`);
  } else if (delta === 0) {
    lines.push(`No change since the last scan — holding at ${curr}${unit}.`);
  } else {
    const dir = delta > 0 ? "up" : "down";
    const helping = delta * goodDirection > 0;
    lines.push(
      `${helping ? "Moving the right way" : "Moving against your goal"} — ${dir} ${Math.abs(delta)}${unit} since the last scan.`
    );
  }

  // Cumulative movement
  if (total !== null && total !== 0 && first !== prev) {
    const dir = total > 0 ? "up" : "down";
    lines.push(`${dir === "up" ? "Up" : "Down"} ${Math.abs(total)}${unit} in total since your first scan.`);
  }

  // Progress toward target
  let progress = null;
  if (target != null) {
    const remaining = +(target - curr).toFixed(1);
    const reached = remaining * goodDirection <= 0;

    if (reached) {
      lines.push(`Target of ${target}${unit} reached.`);
      progress = 100;
    } else {
      lines.push(`${Math.abs(remaining)}${unit} to go to reach ${target}${unit}.`);

      if (first != null && target !== first) {
        progress = Math.max(0, Math.min(100,
          (Math.abs(curr - first) / Math.abs(target - first)) * 100
        ));
      }

      // Required pace
      if (targetDate) {
        const weeksLeft = (new Date(targetDate) - new Date()) / (86400000 * 7);
        if (weeksLeft > 0.5) {
          const perWeek = Math.abs(remaining) / weeksLeft;
          lines.push(`Needs about ${perWeek.toFixed(2)}${unit} per week to land on time.`);
        } else if (weeksLeft > 0) {
          lines.push(`Target date is this week.`);
        } else {
          lines.push(`Target date has passed — worth resetting it.`);
        }
      }
    }
  }

  return { lines, delta, total, progress };
}

function MetricBlock({ label, color, T, data, field, curr, prev, first, target, targetDate, goodDirection, unit }) {
  const analysis = analyseMetric({ label, curr, prev, first, target, targetDate, goodDirection, unit });
  if (!analysis) return null;

  const { lines, delta, progress } = analysis;
  const deltaColor = delta == null || delta === 0 ? T.n600 : (delta * goodDirection > 0 ? T.ok : T.bad);

  return (
    <div style={{ paddingTop: 4 }}>
      <ChartHeading
        label={label}
        color={color}
        T={T}
        right={
          <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 19, fontWeight: 800, color: T.text, lineHeight: 1 }}>
              {curr}<span style={{ fontSize: 11, color: T.n600 }}>{unit}</span>
            </span>
            {delta !== null && (
              <span style={{ fontSize: 12, fontWeight: 700, color: deltaColor }}>
                {delta > 0 ? "+" : ""}{delta}{unit}
              </span>
            )}
          </span>
        }
      />

      <TrendChart
        data={data}
        field={field}
        color={color}
        T={T}
        h={130}
        target={target != null ? { value: target, date: targetDate } : null}
        goodDirection={goodDirection}
        unit={unit}
      />

      {progress !== null && (
        <div style={{ marginTop: 8 }}>
          <div style={{ height: 6, borderRadius: 4, background: `${color}26` }}>
            <div style={{ height: 6, borderRadius: 4, background: color, width: `${progress.toFixed(1)}%`, transition: "width 0.5s" }} />
          </div>
          <div style={{ fontSize: 10, color: T.n600, marginTop: 4 }}>{progress.toFixed(0)}% of the way to target</div>
        </div>
      )}

      <div style={{ marginTop: 8, background: T.bg, borderRadius: 10, padding: "10px 12px", borderLeft: `3px solid ${color}` }}>
        {lines.map((l, i) => (
          <div key={i} style={{ fontSize: 12, color: i === 0 ? T.text : T.n700, lineHeight: 1.55, fontWeight: i === 0 ? 600 : 400 }}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── INBODY TAB ──────────────────────────────────────────────────────────────
function InbodyTab({ inbody, goal, token, userId, onRefresh, T }) {
  const [status, setStatus] = useState("idle"); // idle | reading | confirm | saving | error
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

      const isPdf = file.type === "application/pdf";
      // Use the browser-reported type; fall back to jpeg for odd cases
      const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      const mediaType = isPdf
        ? "application/pdf"
        : (allowed.includes(file.type) ? file.type : "image/jpeg");

      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-5",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: [
              {
                type: isPdf ? "document" : "image",
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

      if (!response.ok || data.error) {
        throw new Error(data.error || `Request failed (${response.status})`);
      }

      const text = (data.content || []).map((c) => c.text || "").join("").trim();
      if (!text) throw new Error("Empty response from the model.");

      const clean = text.replace(/```json|```/g, "").trim();

      let parsed;
      try {
        parsed = JSON.parse(clean);
      } catch {
        throw new Error(`Could not parse the reading: ${clean.slice(0, 120)}`);
      }

      setEditPending({ ...parsed });
      setStatus("confirm");
    } catch (err) {
      setErrorMsg(err.message || "Could not read the scan.");
      setStatus("error");
    }
    // Reset file input
    if (fileRef.current) fileRef.current.value = "";
  };

  const confirmSave = async () => {
    setStatus("saving");
    const d = editPending;
    const date = d.date || todayISO();
    const w = d.weight ? +d.weight : null;

    await sb.insert("inbody_scans", token, {
      user_id: userId,
      date,
      weight: w,
      body_fat: d.body_fat ? +d.body_fat : null,
      muscle_mass: d.muscle_mass ? +d.muscle_mass : null,
    });

    // A scan is also a weigh-in — log it so Home and InBody never disagree
    if (w) await sb.insert("weight_entries", token, { user_id: userId, date, weight: w });

    setEditPending(null);
    setStatus("idle");
    await onRefresh();
  };

  const saveManual = async () => {
    if (!manualForm.date) return;
    setStatus("saving");
    const w = manualForm.weight ? +manualForm.weight : null;

    await sb.insert("inbody_scans", token, {
      user_id: userId,
      date: manualForm.date,
      weight: w,
      body_fat: manualForm.body_fat ? +manualForm.body_fat : null,
      muscle_mass: manualForm.muscle_mass ? +manualForm.muscle_mass : null,
    });

    if (w) await sb.insert("weight_entries", token, { user_id: userId, date: manualForm.date, weight: w });

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

      {/* Per-metric analysis: weight, body fat, muscle */}
      {latest && (
        <div style={card}>
          <Kicker T={T}>Analysis</Kicker>
          <div style={{ fontSize: 11.5, color: T.n600, lineHeight: 1.5 }}>
            {prev
              ? `Compared against your scan on ${fmt(prev.date)}.`
              : "Upload a second scan and each metric will show what changed."}
          </div>

          <MetricBlock
            label="Weight" field="weight" unit=" kg"
            color={T.accent} T={T}
            data={sorted.filter((s) => s.weight != null)}
            curr={latest.weight} prev={prev?.weight} first={sorted.find((s) => s.weight != null)?.weight}
            target={goal?.target_weight} targetDate={goal?.target_date}
            goodDirection={-1}
          />

          <MetricBlock
            label="Body fat" field="body_fat" unit="%"
            color={T.warn} T={T}
            data={sorted.filter((s) => s.body_fat != null)}
            curr={latest.body_fat} prev={prev?.body_fat} first={sorted.find((s) => s.body_fat != null)?.body_fat}
            target={goal?.target_body_fat} targetDate={goal?.target_date}
            goodDirection={-1}
          />

          <MetricBlock
            label="Muscle" field="muscle_mass" unit="%"
            color={T.ok} T={T}
            data={sorted.filter((s) => s.muscle_mass != null)}
            curr={latest.muscle_mass} prev={prev?.muscle_mass} first={sorted.find((s) => s.muscle_mass != null)?.muscle_mass}
            target={goal?.target_muscle} targetDate={goal?.target_date}
            goodDirection={1}
          />

          {/* Recomposition read: fat down while muscle up */}
          {prev && latest.body_fat != null && prev.body_fat != null &&
           latest.muscle_mass != null && prev.muscle_mass != null && (() => {
            const fatD = +(latest.body_fat - prev.body_fat).toFixed(1);
            const musD = +(latest.muscle_mass - prev.muscle_mass).toFixed(1);
            const recomp = fatD < 0 && musD > 0;
            const both   = fatD > 0 && musD < 0;
            return (
              <div style={{ marginTop: 14, borderRadius: 10, padding: "12px 14px", background: recomp ? `${T.ok}1a` : both ? `${T.bad}1a` : T.bg, border: `1px solid ${recomp ? T.ok : both ? T.bad : T.divider}` }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: recomp ? T.ok : both ? T.bad : T.n600, marginBottom: 5 }}>
                  Overall
                </div>
                <div style={{ fontSize: 12.5, color: T.text, lineHeight: 1.55 }}>
                  {recomp && `Body recomposition is working — fat down ${Math.abs(fatD)}% and muscle up ${musD}% at the same time. That is the hardest combination to achieve, and it is why the scale alone would understate your progress.`}
                  {both && `Fat up ${fatD}% and muscle down ${Math.abs(musD)}% since the last scan. Worth reviewing protein intake and training volume before the next one.`}
                  {!recomp && !both && `Fat ${fatD > 0 ? "up" : fatD < 0 ? "down" : "flat"} ${Math.abs(fatD)}%, muscle ${musD > 0 ? "up" : musD < 0 ? "down" : "flat"} ${Math.abs(musD)}%. Mixed movement — one more scan will show whether it is a trend or noise.`}
                </div>
              </div>
            );
          })()}
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
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 10 }}>
              <div><label style={lbl}>Date</label><input style={inp} type="date" value={editPending.date || ""} onChange={(e) => setEditPending(p => ({ ...p, date: e.target.value }))} /></div>
              <div><label style={lbl}>Weight (kg)</label><input style={inp} type="number" step="0.1" value={editPending.weight ?? ""} onChange={(e) => setEditPending(p => ({ ...p, weight: e.target.value }))} /></div>
              <div><label style={lbl}>Body fat (%)</label><input style={inp} type="number" step="0.1" value={editPending.body_fat ?? ""} onChange={(e) => setEditPending(p => ({ ...p, body_fat: e.target.value }))} /></div>
              <div><label style={lbl}>Muscle (%)</label><input style={inp} type="number" step="0.1" value={editPending.muscle_mass ?? ""} onChange={(e) => setEditPending(p => ({ ...p, muscle_mass: e.target.value }))} /></div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={confirmSave} style={{ flex: 1, minHeight: 48, fontFamily: "inherit", fontSize: 14, fontWeight: 700, border: "none", borderRadius: 10, background: T.accent, color: "#fff", cursor: "pointer", boxShadow: `0 6px 16px ${T.glow}` }}>Save scan</button>
              <button onClick={() => { setEditPending(null); setStatus("idle"); }} style={{ minHeight: 48, padding: "0 16px", fontFamily: "inherit", fontSize: 13, fontWeight: 600, border: `1px solid ${T.divider}`, borderRadius: 10, background: "transparent", color: T.n600, cursor: "pointer" }}>Cancel</button>
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
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 10 }}>
              <div><label style={lbl}>Date</label><input style={inp} type="date" value={manualForm.date} onChange={(e) => setManualForm(f => ({ ...f, date: e.target.value }))} /></div>
              <div><label style={lbl}>Weight (kg)</label><input style={inp} type="number" step="0.1" placeholder="e.g. 84.0" value={manualForm.weight} onChange={(e) => setManualForm(f => ({ ...f, weight: e.target.value }))} /></div>
              <div><label style={lbl}>Body fat (%)</label><input style={inp} type="number" step="0.1" placeholder="e.g. 22.0" value={manualForm.body_fat} onChange={(e) => setManualForm(f => ({ ...f, body_fat: e.target.value }))} /></div>
              <div><label style={lbl}>Muscle (%)</label><input style={inp} type="number" step="0.1" placeholder="e.g. 42.0" value={manualForm.muscle_mass} onChange={(e) => setManualForm(f => ({ ...f, muscle_mass: e.target.value }))} /></div>
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
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 10, marginTop: 8, marginBottom: 12 }}>
          <div><label style={lbl}>Date</label><input style={inp} type="date" value={form.date} onChange={set("date")} /></div>
          <div><label style={lbl}>Waist</label><input style={inp} type="number" step="0.1" placeholder="e.g. 93" value={form.waist} onChange={set("waist")} /></div>
          <div><label style={lbl}>Chest</label><input style={inp} type="number" step="0.1" placeholder="e.g. 108" value={form.chest} onChange={set("chest")} /></div>
          <div><label style={lbl}>Hips</label><input style={inp} type="number" step="0.1" placeholder="e.g. 101" value={form.hips} onChange={set("hips")} /></div>
          <div><label style={lbl}>Arms</label><input style={inp} type="number" step="0.1" placeholder="e.g. 37" value={form.arms} onChange={set("arms")} /></div>
          <div><label style={lbl}>Thighs</label><input style={inp} type="number" step="0.1" placeholder="e.g. 58" value={form.thighs} onChange={set("thighs")} /></div>
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
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 10, marginTop: 8, marginBottom: 12 }}>
          <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Exercise</label><input style={inp} placeholder="e.g. Bench press" value={form.exercise} onChange={set("exercise")} /></div>
          <div><label style={lbl}>Weight (kg)</label><input style={inp} type="number" step="0.5" placeholder="e.g. 70" value={form.weight_kg} onChange={set("weight_kg")} /></div>
          <div><label style={lbl}>Reps</label><input style={inp} type="number" placeholder="e.g. 8" value={form.reps} onChange={set("reps")} /></div>
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
  const [data, setData] = useState({ weights: [], inbody: [], measurements: [], logs: [], sessions: [], goal: null });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const T = THEMES[theme];

  const loadData = useCallback(async (tok, uid) => {
    if (!tok || !uid) return;
    setLoading(true);
    const filter = `user_id=eq.${uid}`;
    const [weights, inbody, measurements, logs, goals, sessions] = await Promise.all([
      sb.select("weight_entries", tok, filter),
      sb.select("inbody_scans", tok, filter),
      sb.select("measurements", tok, filter),
      sb.select("workout_logs", tok, filter),
      sb.select("goals", tok, filter, "created_at.desc"),
      sb.select("sessions", tok, filter),
    ]);
    // Surface query failures instead of silently showing empty data.
    // A non-array response means Postgres returned an error object.
    const failures = [
      ["weight_entries", weights], ["inbody_scans", inbody],
      ["measurements", measurements], ["workout_logs", logs],
      ["goals", goals], ["sessions", sessions],
    ].filter(([, r]) => !Array.isArray(r));

    if (failures.length) {
      const msg = failures.map(([t, r]) => `${t}: ${r?.message || r?.hint || "failed"}`).join(" · ");
      console.error("Gauge data load failed —", msg);
      setLoadError(msg);
    } else {
      setLoadError("");
    }

    setData({
      weights: Array.isArray(weights) ? weights : [],
      inbody: Array.isArray(inbody) ? inbody : [],
      measurements: Array.isArray(measurements) ? measurements : [],
      logs: Array.isArray(logs) ? logs : [],
      sessions: Array.isArray(sessions) ? sessions : [],
      goal: Array.isArray(goals) && goals.length ? goals[0] : null,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const applyUser = (user, tok) => {
      if (cancelled) return;
      setUserId(user.id);
      const name = user.user_metadata?.name || user.email?.split("@")[0] || "";
      setUserName(name);
      localStorage.setItem("gauge_user_name", name);
      loadData(tok, user.id);
    };

    (async () => {
      const user = await sb.getUser(token);
      if (user?.id) { applyUser(user, token); return; }

      // Access token expired — try the refresh token before giving up
      const rt = localStorage.getItem("gauge_refresh");
      if (rt) {
        const res = await sb.refresh(rt);
        if (res?.access_token) {
          localStorage.setItem("gauge_token", res.access_token);
          if (res.refresh_token) localStorage.setItem("gauge_refresh", res.refresh_token);
          const u2 = await sb.getUser(res.access_token);
          if (u2?.id) {
            if (!cancelled) setToken(res.access_token);
            applyUser(u2, res.access_token);
            return;
          }
        }
      }

      // Refresh genuinely failed — now sign out
      if (cancelled) return;
      setToken(null);
      localStorage.removeItem("gauge_token");
      localStorage.removeItem("gauge_refresh");
    })();

    return () => { cancelled = true; };
  }, [token, loadData]);

  // Keep the session alive while the app is open, and re-check on resume
  useEffect(() => {
    const renew = async () => {
      const rt = localStorage.getItem("gauge_refresh");
      if (!rt) return;
      const res = await sb.refresh(rt);
      if (res?.access_token) {
        localStorage.setItem("gauge_token", res.access_token);
        if (res.refresh_token) localStorage.setItem("gauge_refresh", res.refresh_token);
        setToken(res.access_token);
      }
    };
    const id = setInterval(renew, 45 * 60 * 1000); // every 45 min
    const onShow = () => { if (document.visibilityState === "visible") renew(); };
    document.addEventListener("visibilitychange", onShow);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onShow); };
  }, []);

  const onAuth = (tok, name) => { setToken(tok); setUserName(name); };
  const signOut = async () => {
    await sb.signOut(token);
    localStorage.removeItem("gauge_token");
    localStorage.removeItem("gauge_refresh");
    localStorage.removeItem("gauge_user_name");
    setToken(null); setUserId(null);
    setData({ weights: [], inbody: [], measurements: [], logs: [], sessions: [], goal: null });
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
    <div className="gauge-page" style={{ background: T.pageBg, color: T.text }}>
      <div className="gauge-shell" style={{ background: T.bg }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px 12px", flexShrink: 0, borderBottom: `1px solid ${T.divider}`, gap: 8 }}>
          <h4 style={{ margin: 0, letterSpacing: "0.14em", color: T.accent, fontSize: 16, fontWeight: 800, flexShrink: 0 }}>GAUGE</h4>
          <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            {loading && <span style={{ fontSize: 10, color: T.n600, flexShrink: 0 }}>Syncing…</span>}
            <span style={{ fontSize: 11, color: T.n600, textTransform: "uppercase", letterSpacing: "0.06em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</span>
            <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} style={{ minHeight: 30, padding: "0 11px", borderRadius: 20, border: `1px solid ${T.divider}`, background: T.surface, color: T.n700, fontFamily: "inherit", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer", flexShrink: 0 }}>
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            <button onClick={signOut} style={{ minHeight: 30, padding: "0 11px", borderRadius: 20, border: `1px solid ${T.divider}`, background: T.surface, color: T.n700, fontFamily: "inherit", fontSize: 10.5, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
              Sign out
            </button>
          </span>
        </div>

        {loadError && (
          <div style={{ background: `${T.bad}1f`, borderBottom: `1px solid ${T.bad}`, color: T.bad, fontSize: 11, padding: "8px 16px", lineHeight: 1.45, flexShrink: 0 }}>
            Some data could not load — {loadError}
          </div>
        )}

        {/* Scroll content */}
        <div className="gauge-scroll" style={{ flex: "1 1 auto", overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "18px 20px 28px" }}>
          {tab === "home"         && <HomeTab weights={data.weights} inbody={data.inbody} sessions={data.sessions} goal={data.goal} name={userName} sessionsProps={{ token, userId, onRefresh: refresh }} T={T} />}
          {tab === "weight"       && <WeightTab weights={data.weights} inbody={data.inbody} goal={data.goal} sessions={data.sessions} token={token} userId={userId} onRefresh={refresh} T={T} />}
          {tab === "inbody"       && <InbodyTab inbody={data.inbody} goal={data.goal} token={token} userId={userId} onRefresh={refresh} T={T} />}
          {tab === "measurements" && <MeasurementsTab measurements={data.measurements} token={token} userId={userId} onRefresh={refresh} T={T} />}
          {tab === "workouts"     && <WorkoutsTab logs={data.logs} token={token} userId={userId} onRefresh={refresh} T={T} />}
        </div>

        {/* Bottom nav — always visible */}
        <div style={{ display: "flex", flexShrink: 0, borderTop: `1px solid ${T.divider}`, background: T.bg, paddingBottom: "env(safe-area-inset-bottom)" }}>
          {NAV.map((n) => (
            <button key={n.id} onClick={() => setTab(n.id)} style={{ flex: 1, minWidth: 0, border: "none", borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "8px 1px 9px", margin: "6px 2px 8px", cursor: "pointer", background: tab === n.id ? T.accent100 : "transparent", color: tab === n.id ? T.accent : T.n500, fontFamily: "inherit", fontSize: 9.5, fontWeight: 600, letterSpacing: "0.01em" }}>
              <NavIcon tab={n.id} />
              <span style={{ whiteSpace: "nowrap" }}>{n.label}</span>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}

