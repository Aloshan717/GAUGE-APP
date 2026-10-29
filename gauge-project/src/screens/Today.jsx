// TODAY — the at-a-glance screen: three goal dials (weight, body fat, muscle),
// what the coach says to change, pace, this week, last session.
import React from "react";
import {
  fmt, mergeWeightSeries, computePace, weekSummary, weekStrip, coachAnalysis,
  goalStartDate, baselineAt, weightDirection, greeting, GOAL_TYPES, withMuscleKg, goalMuscleKg,
} from "../logic";
import { Card, CardHead, ScreenTitle, Ring, Delta, Btn, Muted, StatTile, Grid, WeekStrip, Empty, Icon, PaceBar, Tag } from "../ui";
import { NUM_FONT } from "../theme";
import { CoachCard } from "./Plan";

function Dial({ T, label, value, unit, delta, deltaGood, pace, color, target, onClick }) {
  const tone = pace ? { ok: T.ok, warn: T.warn, bad: T.bad, neutral: color }[pace.color] : color;
  return (
    <button type="button" onClick={onClick} className="g-press" style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 0, fontFamily: "inherit", color: T.text }}>
      <Ring T={T} size={94} stroke={8} progress={pace ? Math.max(pace.progress, 2) : null} marker={pace && !pace.reached ? pace.elapsed : null} color={tone}>
        <span style={{ fontFamily: NUM_FONT, fontWeight: 700, fontSize: 25, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value ?? "—"}</span>
        <span style={{ fontSize: 10, color: T.n600, fontWeight: 700, marginTop: 1 }}>{value != null ? unit : ""}</span>
      </Ring>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: T.n700 }}>
        <span style={{ width: 7, height: 7, borderRadius: 2, background: color }} />{label}
      </span>
      <span style={{ minHeight: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
        {delta != null ? <Delta T={T} value={delta} goodDirection={deltaGood} size={11} /> : <span style={{ fontSize: 11, color: T.n500 }}>—</span>}
        <span style={{ fontSize: 10.5, color: T.n600 }}>{target != null ? `→ ${target}${unit === "kg" ? " kg" : unit}` : "no target"}</span>
      </span>
    </button>
  );
}

export default function TodayTab({ T, data, name, go, openSheet }) {
  const { weights, inbody, sessions, goal } = data;
  const sortedW = mergeWeightSeries(weights, inbody);
  const latest = sortedW[sortedW.length - 1];
  const prevW = sortedW[sortedW.length - 2];
  const sortedIb = withMuscleKg(inbody).sort((a, b) => new Date(a.date) - new Date(b.date));
  const latestIb = sortedIb[sortedIb.length - 1];
  const prevIb = sortedIb[sortedIb.length - 2];

  // Pace runs on the goal's own clock: from the goal's start date, using the
  // reading closest to that date as the starting value.
  const goalStart = goalStartDate(goal);
  const baseW = baselineAt(sortedW, "weight", goalStart);
  const baseBf = baselineAt(sortedIb, "body_fat", goalStart);
  const baseMus = baselineAt(sortedIb, "muscle_kg", goalStart);
  const targetMusKg = goalMuscleKg(goal, latest?.weight);
  const wDir = weightDirection(goal, baseW?.value);

  const pace = (curr, start, target, dir) => goal?.target_date && target != null && curr != null
    ? computePace({ curr, start, target, startDate: goalStart, targetDate: goal.target_date, goodDirection: dir })
    : null;
  const pW = pace(latest?.weight, baseW?.value, goal?.target_weight, wDir);
  const pBf = pace(latestIb?.body_fat, baseBf?.value, goal?.target_body_fat, -1);
  const pMu = pace(latestIb?.muscle_kg, baseMus?.value, targetMusKg, 1);

  const coach = coachAnalysis({ goal, scans: inbody, weights, now: Date.now() });
  const daysLeft = goal?.target_date ? Math.max(0, Math.ceil((new Date(goal.target_date) - new Date()) / 86400000)) : null;
  const week = weekSummary(sessions);
  const strip = weekStrip(sessions);
  const last = [...(sessions || [])].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const goalLabel = GOAL_TYPES.find((g) => g.value === goal?.goal_type)?.label.replace(/ \(.*\)/, "");
  const first = name ? name.split(" ")[0] : "";
  const hasPace = goal?.target_date && (pW || pBf || pMu);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <ScreenTitle T={T}
        sub={new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}
        title={`${greeting(new Date().getHours())}${first ? `, ${first}` : ""}`} />

      {/* ── Dials ── */}
      {latest || latestIb ? (
        <Card T={T} pad={16} style={{ gap: 14 }}>
          <CardHead T={T} label={goal ? (goalLabel || "Your goal") : "Your numbers"}
            right={goal?.target_date
              ? <Tag T={T} color={T.accent}>{daysLeft} days left</Tag>
              : <button type="button" onClick={() => go("plan")} style={{ border: "none", background: "transparent", color: T.accent, fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: 0 }}>Set a goal →</button>} />
          <Grid cols={3} gap={4}>
            <Dial T={T} label="Weight" unit="kg" color={T.accent} value={latest?.weight}
              delta={latest && prevW ? latest.weight - prevW.weight : null} deltaGood={wDir}
              pace={pW} target={goal?.target_weight} onClick={() => go("body", "weight")} />
            <Dial T={T} label="Body fat" unit="%" color={T.fat} value={latestIb?.body_fat}
              delta={latestIb?.body_fat != null && prevIb?.body_fat != null ? latestIb.body_fat - prevIb.body_fat : null} deltaGood={-1}
              pace={pBf} target={goal?.target_body_fat} onClick={() => go("body", "inbody")} />
            <Dial T={T} label="Muscle Mass" unit="kg" color={T.muscle} value={latestIb?.muscle_kg}
              delta={latestIb?.muscle_kg != null && prevIb?.muscle_kg != null ? latestIb.muscle_kg - prevIb.muscle_kg : null} deltaGood={1}
              pace={pMu} target={targetMusKg} onClick={() => go("body", "inbody")} />
          </Grid>
          <Muted T={T} style={{ fontSize: 11, textAlign: "center" }}>
            {latestIb ? `Latest scan ${fmt(latestIb.date)} · changes vs the previous reading` : "Add an InBody scan to fill body fat and muscle mass"}
            {hasPace ? " · ring = progress, tick = where you should be" : ""}
          </Muted>
        </Card>
      ) : (
        <Card T={T}>
          <Empty T={T} icon="scale" title="Start with a weigh-in" text="Log your weight or an InBody scan and your dials, trends and coach light up."
            action={<Btn T={T} icon="plus" onClick={() => openSheet("log")}>Log something</Btn>} />
        </Card>
      )}

      {/* ── Coach ── */}
      {coach.status !== "no-data" && <CoachCard coach={coach} T={T} compact onMore={() => go("plan")} />}

      {/* ── Goal pace ── */}
      {hasPace && (
        <Card T={T}>
          <CardHead T={T} icon="calendar" label="Goal pace" right={<span style={{ fontSize: 11.5, color: T.n600 }}>{fmt(goalStart)} → {fmt(goal.target_date)}</span>} />
          {!goal.start_date && <Muted T={T} style={{ marginTop: -6 }}>Save the goal again in Plan to set an exact start date.</Muted>}
          {goal.target_weight != null && <PaceBar T={T} label="Weight" unit=" kg" color={T.accent} goodDirection={wDir} curr={latest?.weight} start={baseW?.value} startDate={goalStart} target={goal.target_weight} targetDate={goal.target_date} />}
          {goal.target_body_fat != null && <PaceBar T={T} label="Body fat" unit="%" color={T.fat} goodDirection={-1} curr={latestIb?.body_fat} start={baseBf?.value} startDate={goalStart} target={goal.target_body_fat} targetDate={goal.target_date} />}
          {targetMusKg != null && <PaceBar T={T} label="Muscle Mass" unit=" kg" color={T.muscle} goodDirection={1} curr={latestIb?.muscle_kg} start={baseMus?.value} startDate={goalStart} target={targetMusKg} targetDate={goal.target_date} />}
        </Card>
      )}

      {/* ── This week ── */}
      <Card T={T} onClick={() => go("train")}>
        <CardHead T={T} icon="activity" label="Last 7 days" right={<span style={{ color: T.n600 }}><Icon name="chevR" size={16} /></span>} />
        <WeekStrip T={T} days={strip} />
        <Grid cols={3}>
          <StatTile T={T} label="Sessions" value={week.count} />
          <StatTile T={T} label="Time" value={week.minutes} unit="min" />
          {week.dayBurnAvg != null
            ? <StatTile T={T} label="Avg burn" value={week.dayBurnAvg.toLocaleString()} unit="kcal" />
            : <StatTile T={T} label="Burned" value={week.kcal} unit="kcal" />}
        </Grid>
      </Card>

      {/* ── Last session ── */}
      <Card T={T}>
        <CardHead T={T} icon="train" label="Last session" right={last && <span style={{ fontSize: 12, color: T.n600 }}>{fmt(last.date)}</span>} />
        {last ? (
          <>
            <div style={{ fontSize: 17, fontWeight: 750, color: T.text }}>{last.muscles || "No muscles recorded"}</div>
            <Grid cols={2}>
              <StatTile T={T} icon="clock" label="Duration" value={last.duration_min ?? "—"} unit={last.duration_min != null ? "min" : null} />
              <StatTile T={T} icon="flame" label={last.day_kcal != null ? "Burned that day" : "Workout kcal"} value={last.day_kcal ?? last.kcal ?? "—"} unit={(last.day_kcal ?? last.kcal) != null ? "kcal" : null} />
            </Grid>
          </>
        ) : (
          <Muted T={T}>No sessions logged yet.</Muted>
        )}
        <Btn T={T} kind="secondary" icon="plus" onClick={() => openSheet("session")}>Log a session</Btn>
      </Card>

    </div>
  );
}
