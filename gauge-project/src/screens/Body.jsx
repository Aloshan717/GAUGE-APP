// BODY — weight, InBody and measurements, one segment each.
import React, { useState } from "react";
import {
  fmt, mergeWeightSeries, analyseMetric, weightTrend, filterRange, RANGES,
  goalStartDate, baselineAt, weightDirection, withMuscleKg, goalMuscleKg, scanMuscleKg,
} from "../logic";
import { sb, store } from "../api";
import {
  Card, CardHead, ScreenTitle, Segmented, Chips, Btn, Big, Delta, Muted, Row, Tag, DelBtn, Empty, Grid,
  TrendChart, Icon, useShowMore,
} from "../ui";

// ─── WEIGHT ──────────────────────────────────────────────────────────────────
function WeightView({ T, data, onRefresh, openSheet }) {
  const { weights, inbody, goal } = data;
  const [range, setRange] = useState(() => store.get("gauge_weight_range") || "3M");
  const pickRange = (r) => { setRange(r); store.set("gauge_weight_range", r); };
  const sorted = mergeWeightSeries(weights, inbody);
  const latest = sorted[sorted.length - 1];
  const shown = filterRange(sorted, range);
  const trend = weightTrend(sorted);
  const baseW = baselineAt(sorted, "weight", goalStartDate(goal));
  const dir = weightDirection(goal, baseW?.value);
  const del = async (id) => { await sb.delete("weight_entries", id); await onRefresh(); };
  const history = [...sorted].reverse();
  const [historyRows, moreHistory] = useShowMore(T, history, 8);

  if (!latest) {
    return (
      <Card T={T}>
        <Empty T={T} icon="scale" title="No weigh-ins yet" text="Log your weight a few mornings a week and the trend line does the rest."
          action={<Btn T={T} icon="plus" onClick={() => openSheet("weight")}>Log weigh-in</Btn>} />
      </Card>
    );
  }

  const rangeChange = shown.length > 1 ? latest.weight - shown[0].weight : null;

  return (
    <>
      <Card T={T}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div>
            <CardHead T={T} label="Current weight" />
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
              <Big T={T} value={latest.weight} unit="kg" size={54} />
              {rangeChange != null && (
                <span style={{ display: "inline-flex", alignItems: "baseline", gap: 5 }}>
                  <Delta T={T} value={rangeChange} unit=" kg" goodDirection={dir} size={13} />
                  <span style={{ fontSize: 11.5, color: T.n600 }}>{range === "ALL" ? "all time" : `in ${range}`}</span>
                </span>
              )}
            </div>
            <Muted T={T} style={{ marginTop: 4 }}>
              {fmt(latest.date)}
              {trend ? ` · trend ${trend.kgPerWeek > 0 ? "+" : ""}${trend.kgPerWeek} kg/week` : ""}
              {goal?.target_weight != null ? ` · target ${goal.target_weight} kg` : ""}
            </Muted>
          </div>
          <Btn T={T} small icon="plus" onClick={() => openSheet("weight")}>Log</Btn>
        </div>
        <Segmented T={T} size="sm" value={range} onChange={pickRange} options={RANGES.map((r) => [r.id, r.id === "ALL" ? "All" : r.id])} />
        {shown.length > 1 ? (
          <TrendChart T={T} data={shown} field="weight" color={T.accent} h={170} unit=" kg" smooth goodDirection={dir}
            target={goal?.target_weight != null ? { value: goal.target_weight, date: goal.target_date } : null} />
        ) : (
          <Muted T={T}>Only one weigh-in in this range — pick a longer range or log another.</Muted>
        )}
      </Card>

      <Card T={T}>
        <CardHead T={T} label="History" right={<span style={{ fontSize: 12, color: T.n600 }}>{sorted.length} entries</span>} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          {historyRows.map((w, i, arr) => {
            const prev = history[i + 1];
            const d = prev ? w.weight - prev.weight : null;
            const fromScan = w.source === "scan";
            return (
              <Row key={`${w.date}-${w.source}`} T={T} last={i === arr.length - 1}
                title={`${w.weight} kg`}
                sub={<>{fmt(w.date)}{fromScan && <Tag T={T}>from scan</Tag>}</>}
                right={<>
                  {d !== null && <Delta T={T} value={d} unit=" kg" goodDirection={dir} size={12} />}
                  {fromScan ? <span style={{ fontSize: 11, color: T.n500, width: 34, textAlign: "center" }}>InBody</span> : <DelBtn T={T} onClick={() => del(w.id)} />}
                </>} />
            );
          })}
          {moreHistory && <div style={{ display: "flex", justifyContent: "center", paddingTop: 10 }}>{moreHistory}</div>}
        </div>
        <Muted T={T} style={{ fontSize: 11.5 }}>Entries marked "from scan" come from your InBody scans. Delete those in the InBody tab.</Muted>
      </Card>
    </>
  );
}

// ─── INBODY ──────────────────────────────────────────────────────────────────
function MetricBlock({ label, color, T, data, field, curr, prev, first, target, targetDate, goodDirection, unit }) {
  const analysis = analyseMetric({ label, curr, prev, first, target, targetDate, goodDirection, unit });
  if (!analysis) return null;
  const { lines, delta, progress } = analysis;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 14, borderTop: `1px solid ${T.divider}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color }}>
          <span style={{ width: 8, height: 8, borderRadius: 3, background: color }} />{label}
        </span>
        <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <Big T={T} value={curr} unit={unit.trim()} size={24} />
          <Delta T={T} value={delta} goodDirection={goodDirection} size={12} />
        </span>
      </div>

      <TrendChart data={data} field={field} color={color} T={T} h={130} goodDirection={goodDirection} unit={unit}
        target={target != null ? { value: target, date: targetDate } : null} footer={false} />

      {progress !== null && (
        <div>
          <div style={{ height: 6, borderRadius: 4, background: T.surface3 }}>
            <div style={{ height: 6, borderRadius: 4, background: color, width: `${progress.toFixed(1)}%`, transition: "width 0.5s" }} />
          </div>
          <div style={{ fontSize: 11, color: T.n600, marginTop: 5 }}>{progress.toFixed(0)}% of the way to target</div>
        </div>
      )}

      <div style={{ background: T.surface2, borderRadius: 12, padding: "10px 12px", borderLeft: `3px solid ${color}` }}>
        {lines.map((l, i) => (
          <div key={i} style={{ fontSize: 12.5, color: i === 0 ? T.text : T.n700, lineHeight: 1.55, fontWeight: i === 0 ? 600 : 400 }}>{l}</div>
        ))}
      </div>
    </div>
  );
}

function InbodyView({ T, data, onRefresh, openSheet }) {
  const { inbody, goal } = data;
  const sorted = withMuscleKg(inbody).sort((a, b) => new Date(a.date) - new Date(b.date));
  const latest = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const del = async (id) => { await sb.delete("inbody_scans", id); await onRefresh(); };

  return (
    <>
      {/* Adding a scan comes first — it's the main thing this tab is for */}
      <Card T={T} style={{ background: `linear-gradient(135deg, ${T.accent200}, ${T.surface} 65%)`, borderColor: T.accent400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 46, height: 46, borderRadius: 15, background: T.accent, color: T.accentInk, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none", boxShadow: `0 8px 22px ${T.glow}` }}>
            <Icon name="scan" size={23} stroke={2} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>Add an InBody scan</div>
            <Muted T={T}>Photo or PDF of the result sheet — read for you, checked by you.</Muted>
          </div>
        </div>
        <Grid cols={2}>
          <Btn T={T} icon="camera" onClick={() => openSheet("scan", { mode: "upload" })}>Scan sheet</Btn>
          <Btn T={T} kind="ghost" icon="keyboard" onClick={() => openSheet("scan", { mode: "manual" })}>Type it in</Btn>
        </Grid>
      </Card>

      {latest && (
        <Card T={T}>
          <CardHead T={T} label="Latest scan" right={<span style={{ fontSize: 12, color: T.n600 }}>{fmt(latest.date)}</span>} />
          <Grid cols={3}>
            {[
              { label: "Weight", val: latest.weight, unit: "kg", pv: prev?.weight, good: 0, c: T.accent },
              { label: "Body fat", val: latest.body_fat, unit: "%", pv: prev?.body_fat, good: -1, c: T.fat },
              { label: "Muscle Mass", val: latest.muscle_kg, unit: "kg", pv: prev?.muscle_kg, good: 1, c: T.muscle },
            ].map((b) => (
              <div key={b.label} style={{ background: T.surface2, borderRadius: 14, padding: "10px 12px", borderTop: `2px solid ${b.c}`, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.n600 }}>{b.label}</div>
                <Big T={T} value={b.val} unit={b.unit} size={26} />
                <div style={{ minHeight: 16 }}>{b.pv != null && b.val != null && <Delta T={T} value={b.val - b.pv} goodDirection={b.good} size={11.5} />}</div>
              </div>
            ))}
          </Grid>
        </Card>
      )}

      {latest && (
        <Card T={T}>
          <CardHead T={T} label="Trends" />
          <Muted T={T} style={{ marginTop: -6 }}>
            {prev ? `Compared against your scan on ${fmt(prev.date)}.` : "Add a second scan and each metric will show what changed."}
          </Muted>
          <MetricBlock label="Weight" field="weight" unit=" kg" color={T.accent} T={T}
            data={sorted.filter((s) => s.weight != null)}
            curr={latest.weight} prev={prev?.weight} first={sorted.find((s) => s.weight != null)?.weight}
            target={goal?.target_weight} targetDate={goal?.target_date}
            goodDirection={weightDirection(goal, sorted.find((s) => s.weight != null)?.weight)} />
          <MetricBlock label="Body fat" field="body_fat" unit="%" color={T.fat} T={T}
            data={sorted.filter((s) => s.body_fat != null)}
            curr={latest.body_fat} prev={prev?.body_fat} first={sorted.find((s) => s.body_fat != null)?.body_fat}
            target={goal?.target_body_fat} targetDate={goal?.target_date} goodDirection={-1} />
          <MetricBlock label="Muscle Mass" field="muscle_kg" unit=" kg" color={T.muscle} T={T}
            data={sorted.filter((s) => s.muscle_kg != null)}
            curr={latest.muscle_kg} prev={prev?.muscle_kg} first={sorted.find((s) => s.muscle_kg != null)?.muscle_kg}
            target={goalMuscleKg(goal, latest.weight)} targetDate={goal?.target_date} goodDirection={1} />
        </Card>
      )}

      {inbody.length > 0 && (
        <Card T={T}>
          <CardHead T={T} label="Scan history" right={<span style={{ fontSize: 12, color: T.n600 }}>{inbody.length} scans</span>} />
          <div>
            {[...inbody].sort((a, b) => new Date(b.date) - new Date(a.date)).map((s, i, arr) => (
              <Row key={s.id} T={T} last={i === arr.length - 1}
                title={fmt(s.date)}
                sub={<span style={{ fontVariantNumeric: "tabular-nums" }}>{s.weight != null ? `${s.weight} kg` : "—"} · {s.body_fat != null ? `${s.body_fat}% fat` : "—"} · {scanMuscleKg(s) != null ? `${scanMuscleKg(s)} kg muscle mass` : "—"}</span>}
                right={<DelBtn T={T} onClick={() => del(s.id)} />} />
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

// ─── MEASUREMENTS ────────────────────────────────────────────────────────────
const METRICS = ["waist", "chest", "hips", "arms", "thighs"];
const cap = (m) => m.charAt(0).toUpperCase() + m.slice(1);

function MeasureView({ T, data, onRefresh, openSheet }) {
  const { measurements } = data;
  const [metric, setMetric] = useState("waist");
  const sorted = [...measurements].sort((a, b) => new Date(a.date) - new Date(b.date));
  const good = metric === "waist" || metric === "hips" ? -1 : 1;
  const del = async (id) => { await sb.delete("measurements", id); await onRefresh(); };

  if (!sorted.length) {
    return (
      <Card T={T}>
        <Empty T={T} icon="ruler" title="No measurements yet" text="Waist, chest, hips, arms and thighs — tape numbers often move before the scale does."
          action={<Btn T={T} icon="plus" onClick={() => openSheet("measure")}>Add measurements</Btn>} />
      </Card>
    );
  }

  const first = sorted[0][metric], last = sorted[sorted.length - 1][metric];

  return (
    <>
      <Card T={T}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <CardHead T={T} label="Measurements (cm)" />
          <Btn T={T} small icon="plus" onClick={() => openSheet("measure")}>Add</Btn>
        </div>
        <Chips T={T} scroll options={METRICS.map((m) => [m, cap(m)])} value={metric} onChange={setMetric} />
        {sorted.length > 1 ? (
          <>
            <TrendChart data={sorted} field={metric} color={T.accent} T={T} h={150} unit=" cm" goodDirection={good} footer={false} />
            <Grid cols={3}>
              <div><div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.n600 }}>Start</div><Big T={T} value={first} unit="cm" size={22} /></div>
              <div><div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.n600 }}>Latest</div><Big T={T} value={last} unit="cm" size={22} /></div>
              <div><div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.n600, marginBottom: 4 }}>Change</div><Delta T={T} value={last - first} unit=" cm" goodDirection={good} size={15} /></div>
            </Grid>
          </>
        ) : (
          <Muted T={T}>One entry so far ({cap(metric)} {last} cm). Add another to see the trend.</Muted>
        )}
      </Card>

      <Card T={T}>
        <CardHead T={T} label="History" />
        <div>
          {[...measurements].sort((a, b) => new Date(b.date) - new Date(a.date)).map((m, i, arr) => (
            <Row key={m.id} T={T} last={i === arr.length - 1}
              title={fmt(m.date)}
              sub={<span style={{ fontVariantNumeric: "tabular-nums" }}>W {m.waist} · C {m.chest} · H {m.hips} · A {m.arms} · T {m.thighs}</span>}
              right={<DelBtn T={T} onClick={() => del(m.id)} />} />
          ))}
        </div>
      </Card>
    </>
  );
}

export default function BodyTab({ T, data, onRefresh, openSheet, segment, setSegment }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <ScreenTitle T={T} title="Body" sub="Weight, composition and measurements" />
      <Segmented T={T} value={segment} onChange={setSegment} options={[["weight", "Weight"], ["inbody", "InBody"], ["measure", "Measure"]]} />
      {segment === "weight" && <WeightView T={T} data={data} onRefresh={onRefresh} openSheet={openSheet} />}
      {segment === "inbody" && <InbodyView T={T} data={data} onRefresh={onRefresh} openSheet={openSheet} />}
      {segment === "measure" && <MeasureView T={T} data={data} onRefresh={onRefresh} openSheet={openSheet} />}
    </div>
  );
}
