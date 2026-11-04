// TODAY — the at-a-glance screen: three goal dials (weight, body fat, muscle),
// what the coach says to change, pace, this week, last session.
import React from "react";
import {
  fmt, weekSummary, weekStrip, coachAnalysis, greeting, GOAL_TYPES, goalTracks,
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
  // One calculation for every goal number (shared with the InBody tab).
  const tracks = goalTracks({ goal, weights, scans: inbody });
  const { weight: tW, bodyFat: tBf, muscle: tMu, goalStart } = tracks;
  const latestScanDate = [...inbody].map((x) => x.date).sort().slice(-1)[0];
  const wDir = tW.direction;
  const pW = tW.pace, pBf = tBf.pace, pMu = tMu.pace;
  const dlt = (t) => (t.curr != null && t.prev != null ? t.curr - t.prev : null);

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
      {tW.curr != null || latestScanDate ? (
        <Card T={T} pad={16} style={{ gap: 14 }}>
          <CardHead T={T} label={goal ? (goalLabel || "Your goal") : "Your numbers"}
            right={goal?.target_date
              ? <Tag T={T} color={T.accent}>{daysLeft} days left</Tag>
              : <button type="button" onClick={() => go("plan")} style={{ border: "none", background: "transparent", color: T.accent, fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: 0 }}>Set a goal →</button>} />
          <Grid cols={3} gap={4}>
            <Dial T={T} label="Weight" unit="kg" color={T.accent} value={tW.curr}
              delta={dlt(tW)} deltaGood={wDir} pace={pW} target={tW.target} onClick={() => go("body", "weight")} />
            <Dial T={T} label="Body fat" unit="%" color={T.fat} value={tBf.curr}
              delta={dlt(tBf)} deltaGood={-1} pace={pBf} target={tBf.target} onClick={() => go("body", "inbody")} />
            <Dial T={T} label="Muscle Mass" unit="kg" color={T.muscle} value={tMu.curr}
              delta={dlt(tMu)} deltaGood={1} pace={pMu} target={tMu.target} onClick={() => go("body", "inbody")} />
          </Grid>
          <Muted T={T} style={{ fontSize: 11, textAlign: "center" }}>
            {latestScanDate ? `Latest scan ${fmt(latestScanDate)} · changes vs the previous reading` : "Add an InBody scan to fill body fat and muscle mass"}
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
          {[[tW, " kg", T.accent], [tBf, "%", T.fat], [tMu, " kg", T.muscle]].map(([t, u, c]) => (
            <PaceBar key={t.key} T={T} label={t.label} unit={u} color={c} curr={t.curr} target={t.target} pace={t.pace} start={t.start} startDate={t.startDate} />
          ))}
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
