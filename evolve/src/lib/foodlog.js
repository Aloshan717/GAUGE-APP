// EVOLVE — your food log: each day's calories, protein and burn, the last 7
// days in numbers, and every entry you add (kept on this phone, so you can see
// what you logged and take back a mistake).
import { store } from "./api.js";
import { coerceNumber, normalizeDate } from "./core.js";
import { addDays, burnByDate } from "./body.js";

// ── Entries (what you added, when) ──
const key = () => `evolve_food_items_${store.json("evolve_user")?.id || "me"}`;
const all = () => store.json(key()) || {};
let seq = 0;
const newId = () => `f${Date.now().toString(36)}${(seq++).toString(36)}`;

export const itemsFor = (date) => all()[date] || [];
export function addItem(date, { kcal = 0, protein = 0, name = "", kind = "add" }) {
  const db = all();
  const item = { id: newId(), kcal: Math.round(kcal || 0), protein: Math.round(protein || 0), name: String(name || "").trim(), kind, at: Date.now() };
  // "Set the day's total" replaces what came before.
  db[date] = kind === "set" ? [item] : [...(db[date] || []), item];
  // Keep about two months.
  const cut = addDays(date, -62);
  for (const d of Object.keys(db)) if (d < cut) delete db[d];
  store.setJson(key(), db);
  return item.id;
}
export function removeItem(date, id) {
  const db = all();
  db[date] = (db[date] || []).filter((x) => x.id !== id);
  if (!db[date].length) delete db[date];
  store.setJson(key(), db);
}

// ── Days ──
// One row per day, newest first: what you ate, protein, burn, and vs the target.
export function dayRows({ days, sessions, today, n = 30, target }) {
  const burns = burnByDate(days, sessions);
  const byDate = new Map((days || []).map((r) => [normalizeDate(r?.date), r]));
  const rows = [];
  for (let i = 0; i < n; i++) {
    const date = addDays(today, -i);
    const r = byDate.get(date);
    const kcal = coerceNumber(r?.kcal_in) || 0, protein = coerceNumber(r?.protein_g) || 0;
    const logged = kcal > 0 || protein > 0;
    rows.push({ date, kcal, protein, logged, burn: burns.get(date) || null, diff: logged && target ? Math.round(kcal - target) : null, today: i === 0 });
  }
  return rows;
}

// The last 7 full days (today is still going, so it's left out): totals and averages.
export function lastSeven({ days, sessions, today, target, proteinTarget }) {
  const rows = dayRows({ days, sessions, today: addDays(today, -1), n: 7, target });
  const logged = rows.filter((r) => r.logged);
  const sum = (a, f) => a.reduce((s, r) => s + (f(r) || 0), 0);
  const total = sum(logged, (r) => r.kcal);
  const avg = logged.length ? Math.round(total / logged.length) : null;
  const withBurn = logged.filter((r) => r.burn);
  const balance = withBurn.length ? Math.round(sum(withBurn, (r) => r.kcal - r.burn) / withBurn.length) : null;
  return {
    from: rows[rows.length - 1].date, to: rows[0].date, rows: [...rows].reverse(),
    logged: logged.length, total, avg,
    protein: logged.some((r) => r.protein > 0) ? Math.round(sum(logged.filter((r) => r.protein > 0), (r) => r.protein) / logged.filter((r) => r.protein > 0).length) : null,
    vsTarget: avg != null && target ? avg - target : null, target, proteinTarget,
    burn: withBurn.length ? Math.round(sum(withBurn, (r) => r.burn) / withBurn.length) : null,
    balance,                                                     // eaten − burned, per day (days with both)
    kgPerWeek: balance != null ? +((balance * 7) / 7700).toFixed(2) : null,
  };
}
