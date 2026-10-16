// TRAIN — sessions (muscles, time, day burn) and lifts by muscle group.
import React, { useState } from "react";
import { fmt, weekSummary, weekStrip, workoutMuscleTabs, personalBestIds, dailyVolume } from "../logic";
import { sb, store } from "../api";
import { Card, CardHead, ScreenTitle, Chips, Btn, Muted, Row, DelBtn, Empty, Grid, StatTile, WeekStrip, TrendChart, Icon, Tag, useShowMore } from "../ui";

export default function TrainTab({ T, data, onRefresh, openSheet }) {
  const { sessions, logs } = data;
  // Biceps / Triceps replace Arms; "Arms" only appears while old sets use it
  const MUSCLES = workoutMuscleTabs(logs);
  const [muscle, setMuscle] = useState(() => {
    const saved = store.get("gauge_train_muscle");
    return saved && MUSCLES.includes(saved) ? saved : "Chest";
  });
  const pickMuscle = (m) => { setMuscle(m); store.set("gauge_train_muscle", m); };

  const week = weekSummary(sessions);
  const strip = weekStrip(sessions);
  const recent = [...(sessions || [])].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
  const muscleLogs = [...logs].filter((l) => l.muscle_group === muscle).sort((a, b) => new Date(a.date) - new Date(b.date));
  const volumeSeries = dailyVolume(logs, muscle);
  const [setRows, moreSets] = useShowMore(T, [...muscleLogs].reverse(), 8);
  const prs = personalBestIds(logs);
  const del = async (id) => { await sb.delete("workout_logs", id); await onRefresh(); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <ScreenTitle T={T} title="Train" sub="Sessions and lifts" />

      {/* ── Sessions ── */}
      <Card T={T}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <CardHead T={T} icon="activity" label="Last 7 days" />
          <Btn T={T} small icon="plus" onClick={() => openSheet("session")}>Session</Btn>
        </div>
        <WeekStrip T={T} days={strip} />
        <Grid cols={3}>
          <StatTile T={T} label="Sessions" value={week.count} />
          <StatTile T={T} label="Time" value={week.minutes} unit="min" />
          {week.dayBurnAvg != null
            ? <StatTile T={T} label="Avg burn" value={week.dayBurnAvg.toLocaleString()} unit="kcal" />
            : <StatTile T={T} label="Burned" value={week.kcal} unit="kcal" />}
        </Grid>
        {recent.length > 0 ? (
          <div>
            {recent.map((s, i) => (
              <Row key={s.id || `${s.date}-${i}`} T={T} last={i === recent.length - 1}
                title={s.muscles || "No muscles recorded"}
                sub={<>{fmt(s.date)}{s.duration_min != null && <> · {s.duration_min} min</>}</>}
                right={(s.day_kcal ?? s.kcal) != null && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5, color: T.n700, fontVariantNumeric: "tabular-nums" }}>
                    <span style={{ color: T.fat }}><Icon name="flame" size={14} /></span>{(s.day_kcal ?? s.kcal).toLocaleString()}
                  </span>
                )} />
            ))}
          </div>
        ) : (
          <Muted T={T}>No sessions logged yet.</Muted>
        )}
      </Card>

      {/* ── Lifts ── */}
      <Card T={T}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <CardHead T={T} icon="train" label="Lifts" />
          <Btn T={T} small icon="plus" onClick={() => openSheet("set", { muscle })}>Log set</Btn>
        </div>
        <Chips T={T} scroll options={MUSCLES} value={muscle} onChange={pickMuscle} />

        {volumeSeries.length > 1 ? (
          <div>
            <Muted T={T} style={{ marginBottom: 6 }}>{muscle} — total volume per training day (kg × reps, all sets)</Muted>
            <TrendChart data={volumeSeries} field="volume" color={T.accent} T={T} h={140} goodDirection={1} unit=" kg" />
          </div>
        ) : null}

        {muscleLogs.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {setRows.map((l, i, arr) => (
              <Row key={l.id} T={T} last={i === arr.length - 1}
                title={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>{l.exercise}{prs.has(l.id) && <Tag T={T} color={T.warn}>PR</Tag>}</span>}
                sub={<span style={{ fontVariantNumeric: "tabular-nums" }}>{l.weight_kg} kg × {l.reps} · {fmt(l.date)}</span>}
                right={<DelBtn T={T} onClick={() => del(l.id)} />} />
            ))}
            {moreSets && <div style={{ display: "flex", justifyContent: "center", paddingTop: 10 }}>{moreSets}</div>}
          </div>
        ) : (
          <Empty T={T} icon="train" title={`No ${muscle.toLowerCase()} sets yet`} text="Log weight × reps and your volume trend and personal records build up here."
            action={<Btn T={T} kind="secondary" icon="plus" onClick={() => openSheet("set", { muscle })}>Log a {muscle.toLowerCase()} set</Btn>} />
        )}
      </Card>
    </div>
  );
}
