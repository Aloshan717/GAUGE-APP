// PLAN — your goal, what the InBody coach says, and calorie/protein targets.
import React, { useState } from "react";
import {
  todayISO, fmt, mergeWeightSeries, calcCalories, averageDayBurn, directionFor,
  composition, coachAnalysis, GOAL_TYPES, SOURCES,
} from "../logic";
import { sb, store } from "../api";
import { Card, CardHead, ScreenTitle, Btn, Field, Input, Select, FormGrid, Muted, Big, Grid, Tag, Icon } from "../ui";

// ─── COACH CARD (InBody-driven recommendations) ──────────────────────────────
export function CoachCard({ coach, T, compact = false, onMore }) {
  if (!coach || coach.status === "no-data") return null;
  const tone = { ok: T.ok, warn: T.warn, bad: T.bad, info: T.n600 };
  const headline = {
    ok: "On track", warn: "Adjust", bad: "Act now", info: "Building a baseline", "no-goal": "Set a goal type",
  }[coach.status] || "Analysis";
  const c = tone[coach.status] || T.n600;
  const kindLabel = { calories: "Calories", protein: "Protein", training: "Training", goal: "Goal" };
  const kindIcon = { calories: "flame", protein: "bolt", training: "train", goal: "plan" };
  const actions = compact ? coach.actions.filter((a) => a.kind !== "protein" || coach.status !== "ok").slice(0, 3) : coach.actions;
  const findings = compact ? coach.findings.filter((f) => f.tone !== "info").slice(0, 2) : coach.findings;

  return (
    <Card T={T} tone={c}>
      <CardHead T={T} icon="bolt" color={T.accent} label={`Coach${coach.latest ? ` · scan ${fmt(coach.latest.date)}` : ""}`}
        right={<Tag T={T} color={c}>{headline}</Tag>} />

      {findings.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {findings.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13, lineHeight: 1.5, color: T.text }}>
              <span style={{ width: 7, height: 7, borderRadius: 4, background: tone[f.tone] || T.n600, flex: "none", marginTop: 7 }} />
              <span>{f.text}</span>
            </div>
          ))}
        </div>
      )}

      {actions.length > 0 && (
        <div style={{ background: T.surface2, borderRadius: 14, padding: "12px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: T.n600 }}>What to change</div>
          {actions.map((a, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ width: 28, height: 28, borderRadius: 9, background: T.accent100, color: T.accent, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                <Icon name={kindIcon[a.kind] || "info"} size={15} stroke={2} />
              </span>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: T.text }}>
                <strong style={{ color: T.accent600 }}>{kindLabel[a.kind] || "Note"}</strong> — {a.text.replace(/^(Calories|Protein): /, "")}
              </div>
            </div>
          ))}
        </div>
      )}

      {compact ? (
        onMore && (
          <button type="button" onClick={onMore} style={{ alignSelf: "flex-start", border: "none", background: "transparent", color: T.accent, fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: 0, display: "inline-flex", alignItems: "center", gap: 4 }}>
            Full analysis & sources <Icon name="chevR" size={14} stroke={2.2} />
          </button>
        )
      ) : (
        <details style={{ fontSize: 12, color: T.n600, lineHeight: 1.55 }}>
          <summary style={{ cursor: "pointer", fontWeight: 700, color: T.n700 }}>Where these numbers come from</summary>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
            {(coach.sourcesUsed || []).map((k) => SOURCES[k] && <li key={k} style={{ marginBottom: 4 }}>{SOURCES[k]}</li>)}
          </ul>
          <div style={{ marginTop: 6 }}>
            Scan under the same conditions each time (morning, before food and training) — InBody readings move with hydration.
            Changes under ±0.5 kg muscle or ±1 kg fat between scans are treated as noise. General guidance, not medical advice.
          </div>
        </details>
      )}
    </Card>
  );
}

// ─── GOAL ────────────────────────────────────────────────────────────────────
function GoalCard({ T, goal, userId, onRefresh }) {
  const [editing, setEditing] = useState(!goal);
  const [gForm, setGForm] = useState({
    goal_type: goal?.goal_type || "",
    start_date: goal?.start_date || todayISO(),
    target_weight: goal?.target_weight || "", target_date: goal?.target_date || "",
    target_body_fat: goal?.target_body_fat || "", target_muscle: goal?.target_muscle || "",
  });
  const [goalMsg, setGoalMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setGForm((f) => ({ ...f, [k]: e.target.value }));

  const saveGoal = async () => {
    // A date plus at least one target is enough
    const hasTarget = gForm.target_weight || gForm.target_body_fat || gForm.target_muscle;
    if (!gForm.goal_type) { setGoalMsg("Pick a goal type — the analysis depends on it."); return; }
    if (!gForm.start_date || !gForm.target_date || !hasTarget) { setGoalMsg("Add a start date, a target date and at least one target."); return; }
    if (gForm.target_date <= gForm.start_date) { setGoalMsg("Target date must be after the start date."); return; }
    setGoalMsg("");
    setSaving(true);
    const { error } = await sb.insert("goals", {
      user_id: userId,
      goal_type: gForm.goal_type,
      start_date: gForm.start_date,
      target_date: gForm.target_date,
      target_weight:   gForm.target_weight   ? +gForm.target_weight   : null,
      target_body_fat: gForm.target_body_fat ? +gForm.target_body_fat : null,
      target_muscle:   gForm.target_muscle   ? +gForm.target_muscle   : null,
    });
    if (error) { setSaving(false); return; }
    await onRefresh();
    setSaving(false);
    setEditing(false);
  };

  const typeLabel = GOAL_TYPES.find((g) => g.value === goal?.goal_type)?.label;
  const daysLeft = goal?.target_date ? Math.max(0, Math.ceil((new Date(goal.target_date) - new Date()) / 86400000)) : null;

  return (
    <Card T={T}>
      <CardHead T={T} icon="plan" color={T.accent} label="Your goal"
        right={goal && !editing && <Btn T={T} kind="ghost" small icon="edit" onClick={() => setEditing(true)}>Edit</Btn>} />

      {goal && !editing && (
        <>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: T.text, letterSpacing: "-0.01em" }}>{typeLabel || "No goal type yet"}</div>
              <Muted T={T}>{fmt(goal.start_date || goal.created_at?.slice(0, 10))} → {fmt(goal.target_date)}</Muted>
            </div>
            {daysLeft != null && (
              <div style={{ textAlign: "right" }}>
                <Big T={T} value={daysLeft} size={34} color={T.accent} />
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.n600 }}>days left</div>
              </div>
            )}
          </div>
          <Grid cols={3}>
            {[["Weight", goal.target_weight, "kg", T.accent], ["Body fat", goal.target_body_fat, "%", T.fat], ["Muscle", goal.target_muscle, "%", T.muscle]].map(([l, v, u, c]) => (
              <div key={l} style={{ background: T.surface2, borderRadius: 14, padding: "10px 12px", borderTop: `2px solid ${v != null ? c : T.surface3}` }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.n600 }}>{l}</div>
                <Big T={T} value={v} unit={u} size={24} color={v != null ? T.text : T.n500} />
              </div>
            ))}
          </Grid>
          {!goal.goal_type && <Muted T={T} style={{ color: T.warn }}>Pick a goal type (Edit) — the coach needs it.</Muted>}
        </>
      )}

      {editing && (
        <>
          <Muted T={T}>Fill in only what you care about. Leave a target blank to skip it — you don't need a weight goal to track recomposition.</Muted>
          <FormGrid>
            <Field T={T} label="Goal type" span>
              <Select T={T} value={gForm.goal_type} onChange={set("goal_type")}>
                <option value="">Choose…</option>
                {GOAL_TYPES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </Select>
            </Field>
            <Field T={T} label="Start date"><Input T={T} type="date" value={gForm.start_date} onChange={set("start_date")} /></Field>
            <Field T={T} label="Target date"><Input T={T} type="date" value={gForm.target_date} onChange={set("target_date")} /></Field>
            <Field T={T} label="Target weight (kg)"><Input T={T} type="number" step="0.1" inputMode="decimal" placeholder="optional" value={gForm.target_weight} onChange={set("target_weight")} /></Field>
            <Field T={T} label="Target body fat (%)"><Input T={T} type="number" step="0.1" inputMode="decimal" placeholder="optional" value={gForm.target_body_fat} onChange={set("target_body_fat")} /></Field>
            <Field T={T} label="Target muscle (%)"><Input T={T} type="number" step="0.1" inputMode="decimal" placeholder="optional" value={gForm.target_muscle} onChange={set("target_muscle")} /></Field>
          </FormGrid>
          {goalMsg && <div style={{ fontSize: 12.5, color: T.bad }}>{goalMsg}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <Btn T={T} full icon="check" onClick={saveGoal} disabled={saving}>{saving ? "Saving…" : "Save goal"}</Btn>
            {goal && <Btn T={T} kind="ghost" onClick={() => { setEditing(false); setGoalMsg(""); }}>Cancel</Btn>}
          </div>
          <Muted T={T}>Pace is measured from the start date: your reading closest to that day is the starting point.</Muted>
        </>
      )}
    </Card>
  );
}

// ─── CALORIE CARD ────────────────────────────────────────────────────────────
// Starting estimate from your InBody fat-free mass (Katch–McArdle) and logged
// whole-day burn; the coach then corrects it from how your body actually responds.
function CalorieCard({ weights, inbody, goal, sessions, coach, T }) {
  const latest = mergeWeightSeries(weights, inbody).slice(-1)[0];
  const latestScan = [...inbody].sort((a, b) => new Date(a.date) - new Date(b.date)).map(composition).filter(Boolean).slice(-1)[0];
  const ffm = latestScan?.ffm || null;
  const day = averageDayBurn(sessions); // { avg, days } over last 14 days

  const saved = (() => { try { return JSON.parse(store.get("gauge_calc_stats") || "null"); } catch { return null; } })();
  const [stats, setStats] = useState(() => ({
    age: "", height: "", gender: "male", activity: "moderate",
    ...(saved || {}),
    goalDirection: directionFor(goal?.goal_type) !== "maintain" ? directionFor(goal?.goal_type) : (saved?.goalDirection || "recomp"),
  }));
  const [result, setResult] = useState(null);
  const set = (k) => (e) => setStats((s) => ({ ...s, [k]: e.target.value }));

  const calculate = () => {
    store.set("gauge_calc_stats", JSON.stringify(stats));
    setResult(calcCalories({
      weight: latest?.weight,
      height: +stats.height || null,
      age: +stats.age || null,
      gender: stats.gender,
      activity: stats.activity,
      ffm,
      dayBurn: day?.avg,
      goalDirection: stats.goalDirection,
      targetWeight: goal?.target_weight,
      targetDate: goal?.target_date,
    }));
  };

  const dirColor = stats.goalDirection === "lose" ? T.bad : T.ok;
  const needsAgeHeight = !ffm;

  return (
    <Card T={T}>
      <CardHead T={T} icon="flame" color={T.accent} label="Calories & protein" />

      {!latest && <Muted T={T}>Log at least one weight entry first.</Muted>}

      {latest && (
        <>
          <Muted T={T}>
            Weight <strong style={{ color: T.text }}>{latest.weight} kg</strong>
            {ffm && <> · Fat-free mass <strong style={{ color: T.text }}>{ffm} kg</strong> (InBody {fmt(latestScan.date)})</>}
          </Muted>

          {day ? (
            <div style={{ fontSize: 12, color: T.text, background: T.accent100, border: `1px solid ${T.accent200}`, borderRadius: 12, padding: "9px 11px", lineHeight: 1.5 }}>
              Your logged whole-day burn: <strong style={{ color: T.accent600 }}>{day.avg.toLocaleString()} kcal/day</strong> ({day.days} day{day.days > 1 ? "s" : ""} in the last 14).
              {" "}Logged on training days only, so it runs a little high — it's blended with the formula.
            </div>
          ) : (
            <div style={{ fontSize: 12, color: T.n600, background: T.surface2, borderRadius: 12, padding: "9px 11px" }}>
              Log "Burned today" with your sessions and this will use your real burn.
            </div>
          )}

          <FormGrid>
            {needsAgeHeight && <Field T={T} label="Age"><Input T={T} type="number" inputMode="numeric" placeholder="e.g. 30" value={stats.age} onChange={set("age")} /></Field>}
            {needsAgeHeight && <Field T={T} label="Height (cm)"><Input T={T} type="number" inputMode="numeric" placeholder="e.g. 175" value={stats.height} onChange={set("height")} /></Field>}
            {needsAgeHeight && (
              <Field T={T} label="Gender">
                <Select T={T} value={stats.gender} onChange={set("gender")}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </Select>
              </Field>
            )}
            <Field T={T} label="Activity level" span={!needsAgeHeight}>
              <Select T={T} value={stats.activity} onChange={set("activity")}>
                <option value="sedentary">Sedentary</option>
                <option value="light">Light (1–3x/wk)</option>
                <option value="moderate">Moderate (3–5x/wk)</option>
                <option value="active">Active (6–7x/wk)</option>
                <option value="veryActive">Very active</option>
              </Select>
            </Field>
            <Field T={T} label="Goal" span>
              <Select T={T} value={stats.goalDirection} onChange={set("goalDirection")}>
                <option value="recomp">Recomposition (lose fat + build muscle)</option>
                <option value="lose">Lose fat</option>
                <option value="gain">Build muscle</option>
                <option value="maintain">Maintain</option>
              </Select>
            </Field>
          </FormGrid>

          <Btn T={T} full onClick={calculate}>Calculate</Btn>

          {result && (
            <div className="g-fadein" style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 14, borderTop: `1px solid ${T.divider}` }}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.n600, marginBottom: 4 }}>Starting daily target</div>
                  <Big T={T} value={result.target.toLocaleString()} unit="kcal" size={46} color={T.accent} />
                </div>
                <div style={{ textAlign: "right", fontSize: 12, color: T.n600 }}>
                  <div>Maintenance {result.tdee.toLocaleString()}</div>
                  <div style={{ color: dirColor, fontWeight: 700 }}>
                    {result.adjustment < 0 ? `${result.adjustment} deficit` : result.adjustment > 0 ? `+${result.adjustment} surplus` : "maintenance"}
                  </div>
                </div>
              </div>

              <Grid cols={3}>
                {[
                  { label: "Protein", val: result.protein, kcal: result.protein * 4, color: T.accent },
                  { label: "Carbs",   val: result.carbs,   kcal: result.carbs * 4,   color: T.muscle },
                  { label: "Fat",     val: result.fat,     kcal: result.fat * 9,     color: T.fat },
                ].map((m) => (
                  <div key={m.label} style={{ background: T.surface2, borderRadius: 14, padding: "10px 12px", borderTop: `2px solid ${m.color}` }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.n600 }}>{m.label}</div>
                    <Big T={T} value={m.val} unit="g" size={24} />
                    <div style={{ fontSize: 11, color: m.color, fontWeight: 700, marginTop: 2 }}>{m.kcal} kcal</div>
                  </div>
                ))}
              </Grid>

              {coach.kcalAdjust !== 0 && coach.status !== "no-goal" && (
                <div style={{ fontSize: 12.5, lineHeight: 1.5, borderRadius: 12, padding: "9px 11px", background: `${T.warn}16`, border: `1px solid ${T.warn}66`, color: T.text }}>
                  <strong>Your InBody results say:</strong> {coach.kcalAdjust < 0 ? `eat about ${Math.abs(coach.kcalAdjust)} kcal/day less` : `eat about ${coach.kcalAdjust} kcal/day more`} than you are now.
                  Real results beat the formula — follow this over the starting target.
                </div>
              )}

              <Muted T={T} style={{ fontSize: 11.5 }}>
                {result.bmrMethod}: resting burn {result.bmr} kcal{day ? `, blended with your logged ${day.avg} kcal/day` : ""}.
                {result.ratePct ? ` Deficit/surplus sized for ${result.ratePct.toFixed(2)}% of body weight per week.` : ""}
                {result.proteinRange?.basis ? ` Protein range ${result.proteinRange.low}–${result.proteinRange.high} g (${result.proteinRange.basis}).` : ""}
                {" "}This is a starting point; the Coach adjusts it every 2–4 weeks from your scans.
              </Muted>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

export default function PlanTab({ T, data, userId, onRefresh }) {
  const { weights, inbody, goal, sessions } = data;
  const coach = coachAnalysis({ goal, scans: inbody, weights, now: Date.now() });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <ScreenTitle T={T} title="Plan" sub="Goal, coaching and nutrition" />
      {/* key: reset the form whenever a newer goal arrives */}
      <GoalCard key={goal?.id || "none"} T={T} goal={goal} userId={userId} onRefresh={onRefresh} />
      {coach.status !== "no-data"
        ? <CoachCard coach={coach} T={T} />
        : <Card T={T}><CardHead T={T} icon="bolt" color={T.accent} label="Coach" /><Muted T={T}>Add an InBody scan and the coach reads it against your goal: what's working, and what to change in calories, protein and training.</Muted></Card>}
      <CalorieCard T={T} weights={weights} inbody={inbody} goal={goal} sessions={sessions} coach={coach} />
    </div>
  );
}
