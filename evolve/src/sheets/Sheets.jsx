// Bottom sheets: log menu and the small forms. One open at a time.
import React, { useState } from "react";
import { useApp } from "../ctx.js";
import { Sheet, Field, Seg, Chips, Icon, Note } from "../ui.jsx";
import { sb } from "../lib/api.js";
import { fmtDate, fmtNum } from "../lib/i18n.js";
import { coerceNumber } from "../lib/core.js";
import { localISO, addDays, dayRow } from "../lib/body.js";
import ScanForm from "./ScanForm.jsx";
import { Account, InviteForm, ProfileForm } from "./Account.jsx";
import SwapSheet from "./Swap.jsx";
import Setup from "./Setup.jsx";
import AddExercise from "./AddExercise.jsx";
import WatchSync from "./WatchSync.jsx";
import { myMeals, saveMeal, deleteMeal, addMealTo, restoreDay } from "../lib/meals.js";
import { itemsFor, addItem, removeItem } from "../lib/foodlog.js";
import FoodLog from "./FoodLog.jsx";
import ExerciseInfo from "./ExerciseInfo.jsx";
import Summary from "./Summary.jsx";
import Weekly from "./Weekly.jsx";
import Weeks from "./Weeks.jsx";

function DayPicker({ value, onChange }) {
  const { t } = useApp();
  const today = localISO(), yest = addDays(today, -1);
  return (
    <div className="grid2" style={{ gridTemplateColumns: "auto auto minmax(0,1fr)", alignItems: "center" }}>
      <button type="button" className="chip sm" aria-pressed={value === today} onClick={() => onChange(today)}>{t("today")}</button>
      <button type="button" className="chip sm" aria-pressed={value === yest} onClick={() => onChange(yest)}>{t("yesterday")}</button>
      <input className="input" type="date" value={value} max={today} onChange={(e) => onChange(e.target.value || today)} aria-label={t("date")} style={{ minHeight: 40 }} />
    </div>
  );
}

function LogMenu() {
  const { t, openSheet, setTab, closeSheet } = useApp();
  const tiles = [
    ["IB", "tScan", "tScanSub", () => openSheet("scan", { fromLog: true })],
    ["kg", "tWeigh", "tWeighSub", () => openSheet("weigh", { fromLog: true })],
    ["kcal", "tFuel", "tFuelSub", () => openSheet("fuel", { fromLog: true }), true],
    [<Icon key="w" name="watch" size={20} />, "tBurn", "tBurnSub", () => openSheet("burn", { fromLog: true }), true],
    [<Icon key="p" name="play" size={18} />, "tWorkout", "tWorkoutSub", () => { closeSheet(); setTab("train"); window.scrollTo(0, 0); }],
    ["cm", "tMeasure", "tMeasureSub", () => openSheet("measure", { fromLog: true })],
  ];
  return (
    <div className="tiles">
      {tiles.map(([badge, title, sub, fn, hl]) => (
        <button key={title} className={`tile${hl ? " hl" : ""}`} onClick={fn}>
          <span className="badge">{badge}</span>
          <span className="t">{t(title)}</span>
          <span className="s">{t(sub)}</span>
        </button>
      ))}
    </div>
  );
}

function WeighForm() {
  const { t, user, refresh, closeSheet, toast } = useApp();
  const [w, setW] = useState("");
  const [date, setDate] = useState(localISO());
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const v = coerceNumber(w);
    if (!v || v < 25 || v > 350) return;
    setBusy(true);
    const { error } = await sb.insert("weight_entries", { user_id: user.id, date, weight: v });
    setBusy(false);
    if (error) return;
    await refresh(); toast(t("saved")); closeSheet();
  };
  return (
    <>
      <Field label={t("weightKg")}><input className="input" inputMode="decimal" autoFocus value={w} onChange={(e) => setW(e.target.value)} placeholder="85.1" /></Field>
      <Field label={t("date")}><DayPicker value={date} onChange={setDate} /></Field>
      <button className="btn primary lg" onClick={save} disabled={busy || !coerceNumber(w)}>{busy ? t("saving") : t("save")}</button>
      <div className="small muted">{t("weighTip")}</div>
    </>
  );
}

function MeasureForm() {
  const { t, user, refresh, closeSheet, toast } = useApp();
  const keys = ["waist", "chest", "hips", "arms", "thighs"];
  const [f, setF] = useState({});
  const [date, setDate] = useState(localISO());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const save = async () => {
    const row = { user_id: user.id, date };
    keys.forEach((k) => { row[k] = coerceNumber(f[k]) || 0; });
    if (!keys.some((k) => row[k] > 0)) { setErr(t("needValue")); return; }
    setBusy(true);
    const { error } = await sb.insert("measurements", row);
    setBusy(false);
    if (error) return;
    await refresh(); toast(t("saved")); closeSheet();
  };
  return (
    <>
      <div className="grid2">
        {keys.map((k) => (
          <Field key={k} label={`${t(k)} (${t("cm")})`}><input className="input" inputMode="decimal" value={f[k] || ""} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))} /></Field>
        ))}
        <Field label={t("date")} span><DayPicker value={date} onChange={setDate} /></Field>
      </div>
      {err && <div className="err">{err}</div>}
      <button className="btn primary lg" onClick={save} disabled={busy}>{busy ? t("saving") : t("save")}</button>
      <div className="small muted">{t("measureTip")}</div>
    </>
  );
}

// Your saved meals: one tap adds one (with Undo); "Edit" removes them.
export function MealChips({ date, row, onAdded, limit }) {
  const { t, user, refresh, toast } = useApp();
  const [, setRev] = useState(0);
  const meals = myMeals();            // read fresh each time: a meal saved in the sheet shows up right away
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!meals.length) return null;
  const add = async (meal) => {
    if (busy) return;
    setBusy(true);
    const { error, before } = await addMealTo({ userId: user.id, date, meal, row });
    setBusy(false);
    if (error) return;
    const itemId = addItem(date, { kcal: meal.kcal, protein: meal.protein, name: meal.name });
    await refresh();
    toast(t("mealAdded", { name: meal.name }), { label: t("undo"), run: async () => { await restoreDay({ userId: user.id, date, before }); removeItem(date, itemId); refresh(); } });
    onAdded?.();
  };
  const shown = limit ? meals.slice(0, limit) : meals;
  return (
    <div className="col" style={{ gap: 8 }}>
      <div className="row between">
        <span className="label" style={{ margin: 0 }}>{t("myMeals")}</span>
        {!limit && <button className="link" style={{ minHeight: 0, padding: 0 }} onClick={() => setEdit((e) => !e)}>{edit ? t("done") : t("edit")}</button>}
      </div>
      <div className="meal-chips">
        {shown.map((m) => (
          <button key={m.name} type="button" className="meal-chip" disabled={busy} onClick={() => (edit ? null : add(m))} aria-label={`${t("add")} ${m.name}`}>
            <span className="n">{m.name}</span>
            <span className="k">{m.kcal ? `${m.kcal} ${t("kcal")}` : ""}{m.kcal && m.protein ? " · " : ""}{m.protein ? `${m.protein} ${t("g")}` : ""}</span>
            {edit && <span className="x" role="button" aria-label={`${t("del")} ${m.name}`} onClick={(e) => { e.stopPropagation(); deleteMeal(m.name); setRev((r) => r + 1); }}><Icon name="close" size={12} stroke={3} /></span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function FuelForm({ ctx }) {
  const { t, lang, data, derived, refresh, closeSheet, openSheet, toast, user } = useApp();
  const [date, setDate] = useState(ctx?.date || localISO());
  const [armed, setArmed] = useState(null);
  const [, setRev] = useState(0);
  const [mode, setMode] = useState("add");
  const [k, setK] = useState("");
  const [p, setP] = useState("");
  const [asMeal, setAsMeal] = useState(false);
  const [mealName, setMealName] = useState("");
  const [busy, setBusy] = useState(false);
  const row = dayRow(data.days, date) || {};
  const curK = coerceNumber(row.kcal_in) || 0, curP = coerceNumber(row.protein_g) || 0;
  const tg = derived.targets;
  const save = async () => {
    const dk = coerceNumber(k), dp = coerceNumber(p);
    if (dk == null && dp == null) return;
    const next = {
      user_id: user.id, date,
      kcal_in: Math.max(0, Math.round(mode === "add" ? curK + (dk || 0) : dk ?? curK)),
      protein_g: Math.max(0, Math.round(mode === "add" ? curP + (dp || 0) : dp ?? curP)),
      updated_at: new Date().toISOString(),
    };
    setBusy(true);
    const { error } = await sb.upsert("ev_days", next, "user_id,date");
    setBusy(false);
    if (error) return;
    if (asMeal && mealName.trim() && mode === "add") saveMeal({ name: mealName, kcal: dk || 0, protein: dp || 0 });
    addItem(date, mode === "add"
      ? { kcal: dk || 0, protein: dp || 0, name: asMeal ? mealName : "" }
      : { kcal: next.kcal_in, protein: next.protein_g, kind: "set" });
    await refresh(); toast(asMeal && mealName.trim() && mode === "add" ? t("mealSaved", { name: mealName.trim() }) : t("saved"));
    if (ctx?.backTo) openSheet(ctx.backTo.name, ctx.backTo.opts); else closeSheet();
  };
  // Take back one entry: the day's totals go down by it.
  const items = itemsFor(date);
  const known = items.reduce((a, x) => ({ k: a.k + x.kcal, p: a.p + x.protein }), { k: 0, p: 0 });
  const earlier = items.some((x) => x.kind === "set") ? 0 : Math.max(0, curK - known.k);
  const removeEntry = async (it) => {
    if (armed !== it.id) { setArmed(it.id); return; }
    setArmed(null);
    const { error } = await sb.upsert("ev_days", { user_id: user.id, date, kcal_in: Math.max(0, Math.round(curK - it.kcal)), protein_g: Math.max(0, Math.round(curP - it.protein)), updated_at: new Date().toISOString() }, "user_id,date");
    if (error) return;
    removeItem(date, it.id);
    setRev((r) => r + 1);
    await refresh();
    toast(t("flRemoved"));
  };
  const time = (ms) => new Intl.DateTimeFormat(lang === "ar" ? "ar-SA-u-nu-latn" : "en-GB", { hour: "numeric", minute: "2-digit" }).format(new Date(ms));
  return (
    <>
      <div className="small sub">{t("fuelIntro")}</div>
      <MealChips date={date} row={row} />
      <Seg options={[["add", t("modeAdd")], ["set", t("modeSet")]]} value={mode} onChange={setMode} label={t("fuelSheet")} />
      <div className="grid2">
        <Field label={t("fieldKcal")}><input className="input" inputMode="numeric" value={k} onChange={(e) => setK(e.target.value)} placeholder={mode === "set" && curK ? String(curK) : "650"} /></Field>
        <Field label={t("fieldProtein")}><input className="input" inputMode="numeric" value={p} onChange={(e) => setP(e.target.value)} placeholder={mode === "set" && curP ? String(curP) : "45"} /></Field>
      </div>
      {mode === "add" && (
        <>
          <button type="button" className="chip sm" aria-pressed={asMeal} onClick={() => setAsMeal((x) => !x)} style={{ alignSelf: "flex-start" }}>★ {t("saveAsMeal")}</button>
          {asMeal && <input className="input" value={mealName} onChange={(e) => setMealName(e.target.value)} placeholder={t("mealNamePh")} aria-label={t("mealNamePh")} />}
        </>
      )}
      <Field label={t("forDay")}><DayPicker value={date} onChange={setDate} /></Field>
      <div className="small muted">{t("soFar", { k: fmtNum(curK), p: fmtNum(curP) })}{tg?.kcal ? ` · ${t("targetsLine", { k: fmtNum(tg.kcal), p: fmtNum(tg.protein) })}` : ""}</div>
      <button className="btn primary lg" onClick={save} disabled={busy}>{busy ? t("saving") : t("save")}</button>
      {(items.length > 0 || earlier > 0) && (
        <div className="fl-items">
          <div className="label" style={{ margin: 0 }}>{t("flEntries", { date: fmtDate(date, lang) })}</div>
          {items.map((it) => (
            <div key={it.id} className="fl-item">
              <span className="grow">
                <span className="strong">{it.name || (it.kind === "set" ? t("flSetTo") : t("flAdded"))}</span>
                <span className="small muted"> · {time(it.at)}</span>
              </span>
              <span className="small strong">{fmtNum(it.kcal)} {t("kcal")}{it.protein ? ` · ${fmtNum(it.protein)} ${t("g")}` : ""}</span>
              <button type="button" className={armed === it.id ? "btn danger sm" : "del"} onClick={() => removeEntry(it)} onBlur={() => setArmed(null)} aria-label={`${t("del")} ${it.name || ""}`}>
                {armed === it.id ? t("delQ") : <Icon name="trash" size={16} />}
              </button>
            </div>
          ))}
          {earlier > 0 && <div className="small muted">{t("flEarlier", { k: fmtNum(earlier) })}</div>}
        </div>
      )}
      <button className="link" style={{ alignSelf: "center" }} onClick={() => openSheet("foodlog")}>{t("flOpen")}</button>
    </>
  );
}

function BurnForm({ ctx }) {
  const { t, lang, data, refresh, closeSheet, toast, user, openSheet } = useApp();
  const [date, setDate] = useState(ctx?.date || addDays(localISO(), -1));
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  const lastWatch = (data.days || []).filter((d) => d.burn_source === "watch" && d.burn_kcal).map((d) => d.date).sort().pop();
  const hasKey = !!data.profile?.sync_key_hash;
  const row = dayRow(data.days, date) || {};
  const save = async () => {
    const n = coerceNumber(v);
    if (!n || n < 300 || n > 12000) return;
    setBusy(true);
    // Only the burn columns: an upsert leaves the day's calories and protein as they are.
    const { error } = await sb.upsert("ev_days", { user_id: user.id, date, burn_kcal: Math.round(n), burn_source: "manual", updated_at: new Date().toISOString() }, "user_id,date");
    setBusy(false);
    if (error) return;
    await refresh(); toast(t("saved")); closeSheet();
  };
  return (
    <>
      {lastWatch && lastWatch < addDays(localISO(), -1) ? <Note kind="warn" icon="info">{t("autoStale", { date: fmtDate(lastWatch, lang) })}</Note>
        : lastWatch ? <Note>{t("autoOn", { date: fmtDate(lastWatch, lang) })}</Note>
        : hasKey ? <Note kind="plain" icon="watch">{t("autoWaiting")}</Note>
        : <Note kind="plain" icon="watch">{t("autoOff")}</Note>}
      <button className="btn soft" onClick={() => openSheet("sync", { fromLog: true })}>{lastWatch && lastWatch < addDays(localISO(), -1) ? t("fixSync") : t("setupSync")}</button>
      <div className="divider" />
      <Field label={t("manualBurn")}><input className="input" inputMode="numeric" value={v} onChange={(e) => setV(e.target.value)} placeholder={row.burn_kcal ? String(row.burn_kcal) : "2780"} /></Field>
      <Field label={t("forDay")}><DayPicker value={date} onChange={setDate} /></Field>
      <button className="btn primary lg" onClick={save} disabled={busy || !coerceNumber(v)}>{busy ? t("saving") : t("save")}</button>
      <div className="small muted">{t("burnWhere")}</div>
    </>
  );
}

const TITLES = {
  log: "logTitle", weigh: "weighTitle", measure: "measureTitle", fuel: "fuelSheet", burn: "burnSheet", sync: "syncTitle",
  scan: "scanTitle", account: "accountSheet", invite: "inviteTitle", profile: "profileTitle", swap: "swapSheet", setup: "setupTitle", addEx: "addExTitle", exInfo: "exInfoTitle", summary: "sumTitle", weekly: "wkTitle", weeks: "wksTitle", foodlog: "flTitle",
};

export default function Sheets() {
  const { t, sheet, closeSheet, openSheet, rtl } = useApp();
  if (!sheet) return null;
  const back = sheet.fromLog ? () => openSheet(sheet.name === "sync" ? "burn" : "log")
    : sheet.fromAccount ? () => openSheet("account")
    : sheet.backTo ? () => openSheet(sheet.backTo.name, sheet.backTo.opts)
    : null;
  const body = {
    log: <LogMenu />, weigh: <WeighForm />, measure: <MeasureForm />, fuel: <FuelForm ctx={sheet} key={sheet.date || "today"} />, burn: <BurnForm ctx={sheet} key={sheet.date || "yesterday"} />, sync: <WatchSync />,
    scan: <ScanForm />, account: <Account />, invite: <InviteForm />, profile: <ProfileForm />, swap: <SwapSheet ctx={sheet} />, setup: <Setup />, addEx: <AddExercise ctx={sheet} />, exInfo: <ExerciseInfo ctx={sheet} />, summary: <Summary ctx={sheet} />, weekly: <Weekly ctx={sheet} key={sheet.week?.key || "latest"} />, weeks: <Weeks />, foodlog: <FoodLog />,
  }[sheet.name];
  return (
    <Sheet title={t(TITLES[sheet.name] || "logTitle")} onClose={closeSheet} onBack={back} closeLabel={t("close")} backLabel={t("back")} rtl={rtl}>
      {body}
    </Sheet>
  );
}

export { DayPicker, Chips };
